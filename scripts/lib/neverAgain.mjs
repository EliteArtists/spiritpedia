// The owner's never-again lists (migration 0055; owner, 20 Nov 2026): the
// do-not-revive listings (README §18.7) and the do-not-contact addresses.
// Read through each script's own get(). Before 0055 runs there are no
// tables and both lists are empty. The rules themselves are the website's
// (web/utils/neverAgain.js), so the scripts and the admin can't drift.
import { normaliseEmail, reviveMatch } from '../../web/utils/neverAgain.js';

export { normaliseEmail, reviveMatch };

async function rows(get, query) {
  try {
    return await get(query);
  } catch (e) {
    if (/PGRST205|42P01/.test(e.message)) return [];
    throw e;
  }
}

export const doNotRevive = (get) => rows(get, 'do_not_revive?select=name,healer_slug,website_url,youtube_url,reason');

export async function doNotContact(get) {
  return new Set((await rows(get, 'do_not_contact_emails?select=email')).map((r) => r.email));
}

export const reviveLine = (row) =>
  `${row.name} is on the do-not-revive list (${row.reason}): never researched, planned or added again (README §18.7).`;
