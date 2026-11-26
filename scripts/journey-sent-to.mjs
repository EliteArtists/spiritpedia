// Fills the address each past outreach email went to (owner, 26 Nov 2026;
// migration 0057), from Resend's record of the email. Read-only at Resend:
// nothing is sent. Writes journey_messages.sent_to for every email that has
// none, and healer_journeys.sent_to from each journey's newest email.
//
//   node scripts/journey-sent-to.mjs [--env dev|live] [--dry]   (default live)
//
// Run after 0057, dev then live. Safe to run again: it only fills what is
// missing. Keys are read from the env files, never printed. Run from the
// repo root.
import fs from 'node:fs';

const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const args = process.argv.slice(2);
const target = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'live';
const dry = args.includes('--dry');
if (!ENV_FILES[target]) throw new Error('--env dev or live');

const env = Object.fromEntries(
  fs
    .readFileSync(ENV_FILES[target], 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    })
);
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(PROJECTS[target])) throw new Error(`${ENV_FILES[target]} is not the ${target} project`);
if (!env.RESEND_API_KEY) throw new Error(`${ENV_FILES[target]} has no Resend key`);

const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};
const db = async (p, o = {}) => {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, { headers: H, ...o });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resend allows a few requests a second; a 429 waits and tries again.
async function resendTo(id) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const r = await fetch(`https://api.resend.com/emails/${id}`, { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } });
    if (r.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!r.ok) return { error: `Resend ${r.status}` };
    const json = await r.json();
    const to = Array.isArray(json.to) ? json.to[0] : json.to;
    return to ? { to: String(to).trim() } : { error: 'no address in Resend' };
  }
  return { error: 'Resend kept refusing (429)' };
}

try {
  await db('journey_messages?select=sent_to&limit=1');
} catch (err) {
  throw new Error(`Migration 0057 isn't on ${target} yet (${err.message.slice(0, 80)})`);
}

const messages = await db('journey_messages?select=resend_id,journey_id,email_number,sent_to&limit=10000');
const missing = messages.filter((m) => !m.sent_to);
console.log(`${target}: ${messages.length} emails, ${missing.length} without an address${dry ? ' (dry run)' : ''}`);

let filled = 0;
const failed = [];
for (const m of missing) {
  const { to, error } = await resendTo(m.resend_id);
  if (to) {
    m.sent_to = to;
    if (!dry) await db(`journey_messages?resend_id=eq.${encodeURIComponent(m.resend_id)}`, { method: 'PATCH', body: JSON.stringify({ sent_to: to }) });
    filled += 1;
  } else {
    failed.push(`${m.resend_id}: ${error}`);
  }
  await sleep(300);
}

// Each journey: the address of its newest email with one.
const newest = new Map();
for (const m of messages.filter((x) => x.sent_to)) {
  const current = newest.get(m.journey_id);
  if (!current || m.email_number > current.email_number) newest.set(m.journey_id, m);
}
const journeys = await db('healer_journeys?select=id,sent_to,channel,email_1_sent_at&limit=10000');
let journeysFilled = 0;
for (const j of journeys) {
  const m = newest.get(j.id);
  if (!m || j.sent_to === m.sent_to) continue;
  if (!dry) await db(`healer_journeys?id=eq.${j.id}`, { method: 'PATCH', body: JSON.stringify({ sent_to: m.sent_to }) });
  journeysFilled += 1;
}

const left = journeys.filter((j) => j.channel !== 'form' && j.email_1_sent_at && !newest.get(j.id) && !j.sent_to).length;
console.log(`emails filled: ${filled}; journeys filled: ${journeysFilled}; journeys still without an address: ${left}`);
if (failed.length) console.log(`not found at Resend (${failed.length}):\n  ${failed.join('\n  ')}`);
