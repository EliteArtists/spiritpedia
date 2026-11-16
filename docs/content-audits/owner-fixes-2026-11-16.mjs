// Owner decisions on the 13 Nov night sprint report (16 Nov 2026): Luminary by
// editorial stature for Pir Zia Inayat Khan, Zen Mountain Center, Chenrezig
// Institute and the Maitreya Instituut (on dev and live). Everyday Zen is still
// held for a photo, so only its plan changes (it goes in as Luminary).
//
//   node docs/content-audits/owner-fixes-2026-11-16.mjs --env dev|live [--apply | --rollback]
//
// The plans' create.tier is set too, so a re-insert keeps the tier. --apply saves
// the old values to owner-fixes-2026-11-16.<env>.log.json first; --rollback puts
// them back. Keys are read, never printed.
import fs from 'node:fs';

const ENV_FILES = { dev: 'web/.env.development.local', live: 'web/.env.local' };
const LISTED = ['pir-zia-inayat-khan', 'zen-mountain-center-yokoji', 'chenrezig-institute', 'maitreya-instituut'];
const PLAN_ONLY = ['everyday-zen-foundation'];
const WHY = 'Luminary by editorial stature (owner, 16 Nov 2026)';

const args = process.argv.slice(2);
const envName = args[args.indexOf('--env') + 1];
if (!ENV_FILES[envName]) { console.error('Usage: owner-fixes-2026-11-16.mjs --env dev|live [--apply | --rollback]'); process.exit(1); }
const env = Object.fromEntries(
  fs.readFileSync(ENV_FILES[envName], 'utf8').split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const K = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };
const rest = (p, init = {}) => fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
const logPath = `docs/content-audits/owner-fixes-2026-11-16.${envName}.log.json`;

for (const slug of [...LISTED, ...PLAN_ONLY]) {
  const p = `docs/content-audits/${slug}.json`;
  const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (plan.healer.create && plan.healer.create.tier !== 'luminary') {
    plan.healer.create.tier = 'luminary';
    plan.sprint = { ...(plan.sprint || {}), tier_override: WHY };
    fs.writeFileSync(p, `${JSON.stringify(plan, null, 2)}\n`);
  }
}

if (args.includes('--rollback')) {
  for (const { slug, tier } of JSON.parse(fs.readFileSync(logPath, 'utf8'))) {
    const r = await rest(`healers?healer_slug=eq.${slug}`, { method: 'PATCH', body: JSON.stringify({ tier }) });
    console.log(`${slug}: back to ${tier} (${r.status})`);
  }
  process.exit(0);
}

const rows = await (await rest(`healers?select=healer_slug,tier&healer_slug=in.(${LISTED.join(',')})`)).json();
if (args.includes('--apply')) fs.writeFileSync(logPath, `${JSON.stringify(rows.map((r) => ({ slug: r.healer_slug, tier: r.tier, why: WHY })), null, 1)}\n`);
for (const row of rows) {
  if (!args.includes('--apply')) { console.log(`${row.healer_slug}: tier ${row.tier} → luminary (dry run)`); continue; }
  const r = await rest(`healers?healer_slug=eq.${row.healer_slug}`, { method: 'PATCH', body: JSON.stringify({ tier: 'luminary' }) });
  console.log(`${row.healer_slug}: tier ${row.tier} → luminary (${r.status})`);
}
