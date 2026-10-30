import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availabilityFor,
  chooseClaim,
  claimPath,
  inPersonFrom,
  isPlatform,
  isSchool,
  officialFirst,
  teacherCount,
  isHub,
  hubLinkPrefix,
  suggestedListingType,
} from './listings.js';

test('channels, apps and organisations are platforms; people and NULL are not', () => {
  assert.equal(isPlatform({ entity_type: 'channel' }), true);
  assert.equal(isPlatform({ entity_type: 'app' }), true);
  assert.equal(isPlatform({ entity_type: 'organisation' }), true);
  assert.equal(isPlatform({ entity_type: 'individual' }), false);
  assert.equal(isPlatform({ entity_type: null }), false);
  assert.equal(isPlatform(null), false);
});

test('a school is not a person, and is a school (0029)', () => {
  assert.equal(isPlatform({ entity_type: 'school' }), true);
  assert.equal(isSchool({ entity_type: 'school' }), true);
  assert.equal(isSchool({ entity_type: 'channel' }), false);
  assert.equal(isSchool({ entity_type: null }), false);
  assert.equal(isSchool(null), false);
});

test("a school's teacher count counts only its own links", () => {
  const links = [{ hub_id: 1 }, { hub_id: 1 }, { hub_id: 2 }];
  assert.equal(teacherCount({ id: 1 }, links), 2);
  assert.equal(teacherCount({ id: 3 }, links), 0);
  assert.equal(teacherCount({ id: 1 }, null), 0);
});

test('schools and organisations are hubs; channels and people are not', () => {
  assert.equal(isHub({ entity_type: 'school' }), true);
  assert.equal(isHub({ entity_type: 'organisation' }), true);
  assert.equal(isHub({ entity_type: 'channel' }), false);
  assert.equal(isHub({ entity_type: 'individual' }), false);
  assert.equal(isHub(null), false);
});

test('a teacher teaches at a school, on an organisation; a founder founds either', () => {
  assert.equal(hubLinkPrefix('instructor', { entity_type: 'school' }), 'Teaches at');
  assert.equal(hubLinkPrefix('instructor', { entity_type: 'organisation' }), 'Teaches on');
  assert.equal(hubLinkPrefix('founder', { entity_type: 'organisation' }), 'Founder of');
  assert.equal(hubLinkPrefix('founder', { entity_type: 'school' }), 'Founder of');
});

test('Spiritpedia Official comes first, the rest keep their order', () => {
  const list = [{ n: 'a' }, { n: 'b' }, { n: 'sp', official: true }, { n: 'c' }];
  assert.deepEqual(officialFirst(list).map((h) => h.n), ['sp', 'a', 'b', 'c']);
  assert.deepEqual(officialFirst(null), []);
});

test("the admin's type is pre-filled from the applicant's answer", () => {
  assert.equal(suggestedListingType('practitioner'), 'individual');
  assert.equal(suggestedListingType('podcast'), 'channel');
  assert.equal(suggestedListingType('channel'), 'channel');
  assert.equal(suggestedListingType('app'), 'app');
  assert.equal(suggestedListingType('organisation'), 'organisation');
  assert.equal(suggestedListingType('publisher'), 'publisher');
  assert.equal(suggestedListingType('not_sure'), '');
  assert.equal(suggestedListingType(null), '');
});

test('in person / online map to availability and back', () => {
  assert.equal(availabilityFor({ inPerson: false, online: true }), 'worldwide');
  assert.equal(availabilityFor({ inPerson: true, online: true }), 'local_online');
  assert.equal(availabilityFor({ inPerson: true, online: false }), 'local');
  assert.deepEqual(inPersonFrom('local'), { inPerson: true, online: false });
  assert.deepEqual(inPersonFrom('local_online'), { inPerson: true, online: true });
  assert.deepEqual(inPersonFrom('worldwide'), { inPerson: false, online: true });
});

test('one match across healers and publishers is a claim; two is none', () => {
  assert.deepEqual(chooseClaim(['karina'], []), { kind: 'healer', slug: 'karina' });
  assert.deepEqual(chooseClaim([], ['awaken-village-press']), { kind: 'publisher', slug: 'awaken-village-press' });
  assert.deepEqual(chooseClaim(['karina'], ['awaken-village-press']), { ambiguous: true });
  assert.deepEqual(chooseClaim(['a', 'b'], []), { ambiguous: true });
  assert.equal(chooseClaim([], []), null);
});

test('claim paths name publishers', () => {
  assert.equal(claimPath({ kind: 'healer', slug: 'karina' }), '/auth/claim?slug=karina');
  assert.equal(claimPath({ kind: 'publisher', slug: 'a b' }), '/auth/claim?slug=a%20b&kind=publisher');
  assert.equal(claimPath(null), null);
});

test('a publisher’s authors are its people, never its channels', async () => {
  const { authorCount } = await import('./listings.js');
  const publisher = {
    publisher_healers: [
      { healers: { entity_type: 'individual' } },
      { healers: { entity_type: null } },
      { healers: { entity_type: 'channel' } },
      { healers: { entity_type: 'app' } },
      { healers: null },
    ],
  };
  assert.equal(authorCount(publisher), 2);
  assert.equal(authorCount({}), 0);
});
