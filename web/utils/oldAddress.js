// AN OLD ADDRESS LEFT BEHIND (owner, 26 Nov 2026, after Nigel Gee): when the
// admin changes a listing's or publisher's contact email, the website looks
// for the old address anywhere else it is still written, such as a
// booking button that was a mailto: link, a contact form link or a bio, on
// the same listing or its items (books, offerings, free resources, videos),
// or as another listing's email. /api/admin/write returns the list, and
// the Profile tab shows it so each can be fixed there and then.
//
// Pure, so the rule is tested (oldAddress.test.mjs).

const FIELD_LABELS = {
  booking_url: 'Booking button',
  website_url: 'Website',
  contact_form_url: 'Contact form',
  contact_email: 'Contact email',
  contact_email_source: 'Email source',
  bio: 'Bio',
  description: 'Description',
  url: 'Link',
  link_url: 'Link',
  purchase_url: 'Link',
  platform_url: 'Link',
  affiliate_url: 'Link',
};

export function fieldLabel(field) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ');
}

// The columns of `row` whose text holds `address` (any case), other than
// those in `skip`.
export function fieldsHolding(address, row, skip = []) {
  const wanted = (address || '').trim().toLowerCase();
  if (!wanted || !wanted.includes('@') || !row) return [];
  return Object.entries(row)
    .filter(([field, value]) => !skip.includes(field) && typeof value === 'string' && value.toLowerCase().includes(wanted))
    .map(([field]) => field);
}

// Every place in `groups` still holding `address`:
// [{ table, id, name, field, label, href }], in the order given.
export function placesHolding(address, groups) {
  const places = [];
  for (const { table, rows, nameOf, hrefOf, skip = [] } of groups) {
    for (const row of rows || []) {
      for (const field of fieldsHolding(address, row, typeof skip === 'function' ? skip(row) : skip)) {
        places.push({
          table,
          id: row.id,
          name: nameOf(row),
          field,
          label: fieldLabel(field),
          href: hrefOf ? hrefOf(row) : null,
        });
      }
    }
  }
  return places;
}
