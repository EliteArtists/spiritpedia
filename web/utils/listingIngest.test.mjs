import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkListing, findDuplicates, siteKey, slugify, youtubeKey } from './listingIngest.js';
import { parseRef, shapeChannel, suggestTier } from './youtubeChannel.js';

const good = {
  kind: 'individual',
  name: 'Ana Día',
  slug: 'ana-dia',
  tier: 'local_hero',
  subjects: ['reiki'],
  contact_email: 'ana@example.com',
  contact_email_source: 'https://example.com/contact',
  contact_recipient_type: 'personal_business',
  city: 'Lisbon',
  country: 'Portugal',
  location_source: 'https://example.com/about',
  image_urls: ['https://example.com/ana.jpg'],
};

test('slugs follow the sprint ingest: accents folded, dashes kept', () => {
  assert.equal(slugify('Ana Día'), 'ana-dia');
  assert.equal(slugify('Yoga 1–6 / Basics'), 'yoga-1-6-basics');
  assert.equal(slugify("  Mooji's  Sangha "), 'moojis-sangha');
});

test('a complete listing passes', () => {
  assert.deepEqual(checkListing(good, { subjectSlugs: new Set(['reiki']) }), { problems: [], warnings: [] });
});

test('contact: an email needs its page; with neither email nor form it fails', () => {
  assert.match(checkListing({ ...good, contact_email_source: '' }).problems.join(), /where the email is published/);
  const none = checkListing({ ...good, contact_email: '', contact_email_source: '' }).problems.join();
  assert.match(none, /published email or a contact form/);
  assert.deepEqual(
    checkListing({ ...good, contact_email: '', contact_email_source: '', contact_form_url: 'https://example.com/form' }).problems,
    []
  );
  assert.match(checkListing({ ...good, contact_email_source: 'https://x.com/cdn-cgi/l/email-protection' }).problems.join(), /never decode/);
});

test('tiers are named for the kind; Ascended Masters are people with a death year', () => {
  assert.match(checkListing({ ...good, kind: 'organisation', tier: 'ascended_master' }).problems.join(), /Superstar, Shining Star, Rising Star/);
  assert.match(checkListing({ ...good, tier: 'ascended_master' }).problems.join(), /death year/);
  assert.deepEqual(checkListing({ ...good, tier: 'ascended_master', death_year: 1990, city: '', country: '', location_source: '' }).problems, []);
  assert.match(checkListing({ ...good, birth_year: 1950 }).problems.join(), /only for Ascended Masters/);
});

test('subjects: one to three, all real', () => {
  assert.match(checkListing({ ...good, subjects: [] }).problems.join(), /at least one/);
  assert.match(checkListing({ ...good, subjects: ['a', 'b', 'c', 'd'] }).problems.join(), /At most 3/);
  assert.match(checkListing(good, { subjectSlugs: new Set(['yoga']) }).problems.join(), /"reiki" doesn't exist/);
});

test('the base: city level, with its page, or a reason there is none', () => {
  assert.match(checkListing({ ...good, city: 'Noord Holland 1816' }).problems.join(), /city level only/);
  assert.match(checkListing({ ...good, location_source: '' }).problems.join(), /publishes the city/);
  const school = { ...good, kind: 'school', tier: 'local_hero', city: '', country: '', location_source: '' };
  assert.match(checkListing(school).problems.join(), /no country/);
  assert.deepEqual(checkListing({ ...school, no_public_base: 'Online only' }).problems, []);
  // Channels and apps need no base.
  assert.deepEqual(checkListing({ ...school, kind: 'channel' }).problems, []);
});

test('publishers: their own tiers, no base, email optional', () => {
  const pub = { kind: 'publisher', name: 'Hay House', slug: 'hay-house', tier: 'superhero', subjects: ['spirituality'] };
  const r = checkListing(pub);
  assert.deepEqual(r.problems, []);
  assert.ok(r.warnings.some((w) => /No contact email/.test(w)));
});

test('teachers only for schools and organisations', () => {
  const t = [{ slug: 'x', name: 'X', role: 'founder' }];
  assert.match(checkListing({ ...good, teachers: t }).problems.join(), /Only a school or an organisation/);
  assert.match(
    checkListing({ ...good, kind: 'school', teachers: [{ slug: 'x', name: 'X', role: 'guest' }] }).problems.join(),
    /founder or instructor/
  );
});

test('duplicates by slug, name, website or channel', () => {
  const rows = [
    { name: 'Plum Village', healer_slug: 'plum-village', website_url: 'https://plumvillage.org/', youtube_url: 'https://www.youtube.com/@plumvillageapp', entity_type: 'organisation' },
  ];
  const base = { slug: 'pv', name: 'PV' };
  assert.equal(findDuplicates({ ...base, slug: 'plum-village' }, rows)[0].field, 'slug');
  assert.equal(findDuplicates({ ...base, name: ' plum village ' }, rows)[0].field, 'name');
  assert.equal(findDuplicates({ ...base, website_url: 'http://www.PlumVillage.org' }, rows)[0].field, 'website');
  assert.equal(findDuplicates({ ...base, youtube_url: 'youtube.com/@PlumVillageApp/videos' }, rows)[0].field, 'YouTube channel');
  assert.deepEqual(findDuplicates({ ...base, website_url: 'https://plumvillage.org/shop' }, rows), []);
});

test('site and channel keys', () => {
  assert.equal(siteKey('https://www.Example.com/about/?x=1'), 'example.com/about');
  assert.equal(youtubeKey('https://www.youtube.com/channel/UCabc'), 'channel/ucabc');
  assert.equal(youtubeKey('https://example.com/@x'), null);
});

test('YouTube: references, the channel shape and the suggested tier', () => {
  assert.deepEqual(parseRef('https://www.youtube.com/@ishtayoga9'), { handle: '@ishtayoga9' });
  assert.deepEqual(parseRef('youtu.be/dQw4w9WgXcQ'), { video: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseRef('https://example.com/@x'), {});
  const c = shapeChannel({ id: 'UC1', snippet: { title: 'T', customUrl: '@t', thumbnails: { high: { url: 'a.jpg' } } }, statistics: { subscriberCount: '120000' } });
  assert.equal(c.url, 'https://www.youtube.com/@t');
  assert.equal(c.subscribers, 120000);
  assert.equal(c.avatar, 'a.jpg');
  assert.equal(suggestTier(1_000_000), 'superhero');
  assert.equal(suggestTier(c.subscribers), 'luminary');
  assert.equal(suggestTier(99_999), 'local_hero');
  assert.equal(suggestTier(null), null);
});

test("contact: a publisher's email needs its page too; the recipient type is checked", () => {
  const pub = { kind: 'publisher', name: 'Hay House', slug: 'hay-house', tier: 'superhero', subjects: ['spirituality'] };
  assert.match(checkListing({ ...pub, contact_email: 'info@hayhouse.com' }).problems.join(), /where the email is published/);
  const sourced = { ...pub, contact_email: 'info@hayhouse.com', contact_email_source: 'https://www.hayhouse.com/contact' };
  assert.deepEqual(checkListing({ ...sourced, contact_recipient_type: 'business' }).problems, []);
  assert.ok(checkListing(sourced).warnings.some((w) => /Recipient type not set/.test(w)));
  assert.ok(checkListing({ ...sourced, contact_recipient_type: 'unknown' }).warnings.some((w) => /Recipient type not set/.test(w)));
  assert.match(checkListing({ ...sourced, contact_recipient_type: 'friend' }).problems.join(), /isn't one of the set/);
});
