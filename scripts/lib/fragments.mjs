// The item-link fragment cleanup (owner, 11 Nov 2026), as pure functions so
// scripts/lib/fragments.test.mjs can test them. Used by
// scripts/fragment-apply.mjs, which reads its strip list from the report
// scripts/fragment-report.mjs wrote (docs/reports/2026-11-11-item-link-fragments.md).

// Kept as they are by the owner's decision, whatever the report proposes.
export const KEEP = [
  { table: 'free_resources', listing: 'jon-kabat-zinn' },
];

// The report's table → [{ table, title, listing, fragment, proposed }].
export function parseReportTable(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| Item ') || line.startsWith('| :--')) continue;
    const cells = line.slice(1, -1).split(' | ').map((c) => c.trim());
    if (cells.length !== 6) continue;
    const [title, kind, listing, frag, , proposed] = cells;
    const fragment = frag.replace(/^`#/, '').replace(/`$/, '');
    rows.push({
      table: kind === 'offering' ? 'courses' : kind === 'free resource' ? 'free_resources' : null,
      title,
      listing: listing === '—' ? null : listing,
      fragment,
      proposed,
    });
  }
  return rows.filter((r) => r.table);
}

export const wantsStrip = (row) => /strip after 0047/.test(row.proposed) && !/^keep/.test(row.proposed);
export const isKept = (row) => KEEP.some((k) => k.table === row.table && k.listing === row.listing);

// 'https://x.org/a/#b' → 'https://x.org/a/'.
export function stripFragment(url) {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}

// The item's identity under 0047's keys: offerings per listing, free
// resources across the table.
export const itemKey = (table, url, title, healerId) =>
  table === 'courses' ? `${url}\u0000${healerId}\u0000${title}` : `${url}\u0000${title}`;

// Report rows + the database rows with fragments + every database row on each
// stripped link → { changes, skipped }.
//   dbRows:      [{ table, id, title, url, listing, healer_id }]
//   onStripped:  Map(`${table}:${strippedUrl}` → [{ id, title, healer_id }])
export function planStrips(reportRows, dbRows, onStripped) {
  const changes = [];
  const skipped = [];
  const taken = new Set();
  for (const r of reportRows) {
    if (!wantsStrip(r)) continue;
    if (isKept(r)) { skipped.push({ ...r, why: "kept by the owner's decision (11 Nov 2026)" }); continue; }
    const match = dbRows.filter((d) => d.table === r.table && d.listing === r.listing && d.url.endsWith(`#${r.fragment}`)
      && decodeURIComponent(d.url.slice(d.url.indexOf('#') + 1)) === r.fragment);
    if (match.length !== 1) { skipped.push({ ...r, why: match.length ? 'more than one row matches' : 'no longer in the database with this link' }); continue; }
    const d = match[0];
    const after = stripFragment(d.url);
    const key = itemKey(d.table, after, d.title, d.healer_id);
    const clash = (onStripped.get(`${d.table}:${after}`) || [])
      .find((o) => o.id !== d.id && itemKey(d.table, after, o.title, o.healer_id) === key);
    if (clash) { skipped.push({ ...r, id: d.id, why: `stripping would match row ${clash.id} (same link and title${d.table === 'courses' ? ' on this listing' : ''})` }); continue; }
    if (taken.has(key)) { skipped.push({ ...r, id: d.id, why: 'stripping would match another row in this run' }); continue; }
    taken.add(key);
    changes.push({ table: d.table, id: d.id, title: d.title, listing: d.listing, before: d.url, after });
  }
  return { changes, skipped };
}
