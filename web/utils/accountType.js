// What the account page calls the account: the type set at approval, not the
// sign-up choice. A practitioner's listing says what they are (a person, a
// channel, an app, an organisation) and a publisher account manages a
// publisher. Until approval it reads "Practitioner (awaiting approval)"; a
// declined applicant is an explorer again (user_type reverts).
const LISTING_WORDS = {
  individual: 'Practitioner',
  channel: 'Channel',
  app: 'App',
  organisation: 'Organisation',
};

export function accountTypeLabel({ userType, status, healerSlug, publisherId, entityType }) {
  if (userType !== 'practitioner') return 'Explorer';
  if (status !== 'approved' || !(healerSlug || publisherId)) return 'Practitioner (awaiting approval)';
  if (publisherId) return 'Publisher';
  return LISTING_WORDS[entityType] || 'Practitioner';
}
