// The shared outreach sequence (C1–C8 for channels, apps, organisations,
// schools and publishers; docs/email-copy-2026-11-11-shared-journey.md) as
// the recipients would read it, for the owner to check before switching it
// on. One real listing of each kind, read from the database, each email
// rendered by the website's own code (web/utils/email.js → journeyTemplate),
// C4's sentence from that listing's real relationships (listingFacts).
//
//   node scripts/shared-journey-preview.mjs [--env dev|live] [out.md]
//   default live → docs/reports/<today>-shared-journey-preview.md
//
// READ ONLY: GETs, nothing written to the database, nothing sent. No email
// addresses are printed. Keys are read from the env file, never printed. Run
// from the repo root.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { JOURNEY_EMAILS, journeyTemplate } from '../web/utils/email.js';
import { listingFacts } from '../web/utils/journey.js';
import { listingDetail } from '../web/utils/emailTemplates.js';

const PROJECTS = { dev: 'khtpbnofcavoerorajni', live: 'uzmvcgewxgvnybdhvsyx' };
const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };

const args = process.argv.slice(2);
const envName = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'live';
const today = new Date().toISOString().slice(0, 10);
const out = args.find((a) => a.endsWith('.md')) || `docs/reports/${today}-shared-journey-preview.md`;
if (!PROJECTS[envName]) {
  console.error('Usage: node scripts/shared-journey-preview.mjs [--env dev|live] [out.md]');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL?.includes(PROJECTS[envName]) || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`${ENV_FILES[envName]} does not point at the ${envName} project, or has no service key.`);
  process.exit(1);
}
const { createClient } = createRequire(new URL('../web/package.json', import.meta.url))('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A listing of each kind that shows its C4 sentence at its fullest: one with
// the relationship its sentence needs, if there is one, else the first.
async function sample(kind) {
  if (kind === 'publisher') {
    const { data } = await supabase.from('publishers').select('id, name, slug').order('name').limit(50);
    for (const p of data || []) {
      const facts = await listingFacts(supabase, { publisherId: p.id });
      if (facts.books > 0) return { name: p.name, slug: p.slug, facts, publisher: true };
    }
    const p = data?.[0];
    return p && { name: p.name, slug: p.slug, facts: await listingFacts(supabase, { publisherId: p.id }), publisher: true };
  }
  const { data } = await supabase
    .from('healers')
    .select('id, name, healer_slug')
    .eq('entity_type', kind)
    .order('name')
    .limit(50);
  let first = null;
  for (const h of data || []) {
    const facts = await listingFacts(supabase, { entityType: kind, healerId: h.id, healerSlug: h.healer_slug });
    const row = { name: h.name, slug: h.healer_slug, facts, entityType: kind };
    first ||= row;
    if (facts.videos + facts.episodes + facts.teachers > 0) return row;
  }
  return first;
}

const KINDS = [
  ['channel', 'Channel'],
  ['app', 'App'],
  ['organisation', 'Organisation'],
  ['school', 'School'],
  ['publisher', 'Publisher'],
];

const lines = [
  `# Shared outreach journey: the 40 emails as sent (${today})`,
  '',
  'The shared C1–C8 for channels, apps, organisations, schools and publishers, from',
  '`docs/email-copy-2026-11-11-shared-journey.md` with "Claim your listing:" (owner, 11 Nov 2026).',
  `Each is rendered by the website's own code for a real listing on ${envName}, read only. Nothing`,
  'was sent, and these journeys stay switched off until the owner turns them on. Plain text, from',
  'and reply-to love@spiritpedia.co. C4 carries the one sentence that depends on the listing;',
  'the fallbacks used when a listing has no such relationship are at the end.',
  '',
  `Made by \`node scripts/shared-journey-preview.mjs --env ${envName}\`.`,
  '',
];

for (const [kind, label] of KINDS) {
  const listing = await sample(kind);
  if (!listing) {
    lines.push(`## ${label}`, '', `No ${kind} listing on ${envName}.`, '');
    continue;
  }
  const f = listing.facts;
  lines.push(
    `## ${label}: ${listing.name}`,
    '',
    `On the listing: videos ${f.videos}, episodes ${f.episodes}, linked teachers ${f.teachers}, books ${f.books}.`,
    ''
  );
  for (let n = 1; n <= JOURNEY_EMAILS; n += 1) {
    const email = journeyTemplate(n, {
      entityType: listing.entityType,
      publisher: Boolean(listing.publisher),
      healerName: listing.name,
      healerSlug: listing.slug,
      facts: f,
    });
    lines.push(`### C${n} · ${label}`, '', `**Subject:** ${email.subject}`, '', '```text', email.text, '```', '');
  }
}

lines.push('## C4 when the listing has no relationship to mention', '');
for (const [kind, label] of KINDS) {
  lines.push(`- **${label}:** ${listingDetail(kind, {})}`);
}
lines.push('');

fs.writeFileSync(out, lines.join('\n'));
console.log(`40 emails → ${out}`);
