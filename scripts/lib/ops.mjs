// What scripts/ops-sync.mjs reads from the repo, as pure functions so
// scripts/lib/ops.test.mjs can test them (node --test scripts/lib).

// README §18.7's "Retry on another day" item → [{ name, reason }].
// The item is one numbered paragraph; names are separated by commas outside
// brackets, each with an optional "(why)". A closing sentence that isn't a
// name ("X goes in once …") is kept as its own entry, reason and all.
export function parseRetryList(readme) {
  const m = readme.match(/\n\d+\.\s+\*\*Retry on another day\*\*([\s\S]*?)(?=\n\d+\.\s+\*\*|\n\n)/);
  if (!m) return [];
  let text = m[1].replace(/\s+/g, ' ').trim().replace(/^\([^)]*\)\s*:?\s*/, '').replace(/^:\s*/, '');
  const sentences = [];
  let depth = 0; let cur = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    cur += ch;
    if (ch === '.' && depth === 0) { sentences.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) sentences.push(cur.trim());

  const out = [];
  const [list, ...rest] = sentences;
  const parts = [];
  depth = 0; cur = '';
  for (const ch of (list || '').replace(/\.$/, '')) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  for (const p of parts.map((s) => s.trim().replace(/^and\s+/, '')).filter(Boolean)) {
    const b = p.indexOf('(');
    const name = (b === -1 ? p : p.slice(0, b)).trim();
    const reason = b === -1 ? null : p.slice(b + 1, p.lastIndexOf(')')).trim();
    if (name) out.push({ name, reason });
  }
  for (const s of rest) out.push({ name: s.replace(/\s+(goes in|go in|waits?)\b[\s\S]*$/, '').trim() || s, reason: s });
  return out;
}

// A parsed plan → the held_plan row's fields, or null when it isn't held.
export function heldPlanRow(plan, relPath) {
  if (!plan || typeof plan !== 'object') return null;
  const held = plan.sprint && typeof plan.sprint === 'object' ? plan.sprint.held : null;
  if (!held) return null;
  const slug = plan.healer?.healer_slug || null;
  return {
    kind: 'held_plan',
    item_key: relPath,
    title: plan.healer?.create?.name || slug || relPath,
    slug,
    reason: typeof held === 'string' ? held : JSON.stringify(held),
    path: relPath,
    detail: { sprint: plan.sprint.sprint ?? null, hub: plan.sprint.hub ?? null, rank: plan.sprint.rank ?? null },
  };
}

// Plans and reports outside the folders whose plans are finished with.
export const SKIP_DIRS = ['/dropped/', '/skipped/', '/leads/'];
export const isLivePlanPath = (rel) => !SKIP_DIRS.some((d) => rel.includes(d));

// A report file name → a sprint report? Sprint and content-run reports and
// their "-live" follow-ups; not plans, audits or build notes.
export const isSprintReport = (name) =>
  name !== 'latest.md' && /^\d{4}-\d{2}-\d{2}-.*(sprint|content-run|-live)/.test(name);

// Slugs on dev and not on live.
export function devOnly(devRows, liveSlugs) {
  const live = new Set(liveSlugs);
  return devRows.filter((r) => r.healer_slug && !live.has(r.healer_slug));
}
