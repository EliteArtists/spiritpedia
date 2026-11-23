// A listing address that doesn't exist but is very close to one that does
// (owner, 23 Nov 2026, after Flying Cloud Zen): /healers/flying-cloud-zen for
// /healers/flying-cloud-zen-community. The listing pages send the visitor on
// to the real one instead of a 404.
//
// "Very close", best first; within the best kind found, exactly one listing
// must match, or there is no guess (a 404 is better than the wrong teacher):
//   1. the same apart from capitals or hyphens   Flying-Cloud-Zen-Community,
//                                                 flyingcloudzen-community
//   2. one letter wrong, missing or extra        flying-clud-zen-community
//   3. whole words missing or added at the end   flying-cloud-zen,
//      (two words or more on the shorter side)   ajahn-brahm-talks
// Not two letters: sam-harris and dan-harris are two people.
// Pure, so the rule is tested (nearSlug.test.mjs).

function tidy(slug) {
  let value = String(slug || '');
  try {
    value = decodeURIComponent(value);
  } catch {
    // A broken % sequence: compare it as it came.
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Edit distance, giving up once it is past `max`.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

const words = (slug) => slug.split('-').filter(Boolean).length;

// How close `real` is to `wanted` (1 best, 3 loosest), or 0 for not close.
function closeness(wanted, real) {
  if (wanted.replace(/-/g, '') === real.replace(/-/g, '')) return 1;
  if (wanted.length >= 5 && distance(wanted, real, 1) <= 1) return 2;
  if (words(wanted) >= 2 && real.startsWith(`${wanted}-`)) return 3;
  if (words(real) >= 2 && wanted.startsWith(`${real}-`)) return 3;
  return 0;
}

// The one real slug `slug` is very close to, or null.
export function nearSlug(slug, slugs) {
  const wanted = tidy(slug);
  if (!wanted) return null;
  let level = 0;
  let found = [];
  for (const real of slugs || []) {
    if (!real || real === slug) continue;
    const near = closeness(wanted, real.toLowerCase());
    if (!near || (level && near > level)) continue;
    if (near < level || !level) {
      level = near;
      found = [real];
    } else if (!found.includes(real)) {
      found.push(real);
    }
  }
  return found.length === 1 ? found[0] : null;
}
