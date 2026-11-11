// WHOSE INBOX A CONTACT EMAIL IS (migration 0048): healers and publishers
// contact_recipient_type, and the journey's copy of it. The meanings are in
// the migration's comments. No imports, so admin pages (client components)
// can use it as well as the server's eligibility check (utils/journey.js).
export const RECIPIENT_TYPES = {
  business: 'Business inbox (info@, hello@)',
  organisation: 'Organisation inbox (charity, religious body, school)',
  personal_business: "A named person's address at the business",
  personal: "A private individual's own address",
  unknown: 'Not decided',
};

export const RECIPIENT_TYPE_OPTIONS = Object.entries(RECIPIENT_TYPES).map(([value, label]) => ({ value, label }));

// Short words for a row: "Business", "Named person at business".
export const RECIPIENT_TYPE_SHORT = {
  business: 'Business inbox',
  organisation: 'Organisation inbox',
  personal_business: 'Named person at business',
  personal: 'Private individual',
  unknown: 'Not decided',
};
