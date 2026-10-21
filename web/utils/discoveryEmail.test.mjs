import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectEdition } from './discoverySelect.js';
import { renderDiscoveryEdition } from './discoveryEmail.js';

const SITE = 'https://www.spiritpedia.co';
const LINKS = {
  library: `${SITE}/library`,
  online: `${SITE}/editions/tok`,
  preferences: `${SITE}/email-preferences?token=t`,
  unsubscribe: `${SITE}/unsubscribe?token=t`,
};
const person = (slug, tier, subjects, extra = {}) => ({
  healer_slug: slug, name: extra.name || slug, tier, subject_slugs: subjects, entity_type: 'individual',
  image_url: `https://storage.test/${slug}.jpg`, availability_type: 'Worldwide (Online Sessions)', place_id: null, official: false, ...extra,
});
function input(overrides = {}) {
  return {
    userId: 'u1', editionNumber: 1, moreOf: ['qigong', 'consciousness'], hidden: [], learning: null, saves: [],
    area: null, places: {}, history: [], today: '2026-11-01', saveCounts: {}, broken: {},
    catalogue: {
      subjects: { qigong: 'Qigong', consciousness: 'Consciousness', reiki: 'Reiki' },
      healers: [
        person('jeffrey-chand', 'superhero', ['qigong'], { name: 'Jeffrey Chand' }),
        person('alan-watts', 'ascended_master', ['consciousness'], { name: 'Alan Watts' }),
        person('eckhart-tolle', 'superhero', ['consciousness'], { name: 'Eckhart Tolle' }),
        person('olly', 'local_hero', ['consciousness'], { name: 'Olly Online' }),
      ],
      videos: [
        { slug: 'thoughts', title: 'Where Do Our Thoughts Come From?', subject_slugs: ['consciousness'], healer_slug: 'eckhart-tolle', platform_url: 'https://www.youtube.com/watch?v=abc' },
        { slug: 'breathing', title: 'Guided Breathing', subject_slugs: ['qigong'], healer_slug: 'kim', platform_url: 'https://youtu.be/def' },
      ],
      freeResources: [{ slug: 'starter', title: 'Keep exploring your practice', subject_slugs: ['qigong'], is_active: true }],
    },
    ...overrides,
  };
}

test('every link goes to a Spiritpedia page; images may come from elsewhere', () => {
  const { edition, picks } = selectEdition(input());
  const m = renderDiscoveryEdition({ edition, picks, firstName: 'Sarah', links: LINKS });
  const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&'));
  assert.ok(hrefs.length >= 10);
  for (const h of hrefs) assert.ok(h.startsWith(`${SITE}/`), `off-site link: ${h}`);
  for (const line of m.text.split('\n')) {
    for (const url of line.match(/https?:\/\/\S+/g) || []) assert.ok(url.startsWith(`${SITE}/`), `off-site link in text: ${url}`);
  }
});

test('the design, in order, with the approved words', () => {
  const { edition, picks } = selectEdition(input());
  const m = renderDiscoveryEdition({ edition, picks, firstName: 'Sarah', links: LINKS });
  assert.equal(m.subject, 'A little space for discovery ✦');
  assert.match(m.preheader, /^Meet Jeffrey Chand, and a little more (Qigong|Consciousness)\.$/);
  const order = ['Your discoveries', 'A little space for discovery.', 'Hi Sarah,', 'Meet Jeffrey Chand', 'More of what you love', 'A little closer to home', 'A voice worth discovering', 'Something freely shared', 'No need to explore everything today', 'Your Guiding Star ✦', 'Change what I receive', 'Unsubscribe'];
  let at = -1;
  for (const piece of order) {
    const i = m.html.indexOf(piece, at + 1);
    assert.ok(i > at, `"${piece}" out of order or missing`);
    at = i;
  }
  assert.match(m.html, /Explore Jeffrey&#39;s work →/);
  assert.match(m.html, /♡ Save/);
  assert.match(m.text, /^Hi Sarah,\n\n/);
});

test('no name: "Hello,"; nothing unfilled; small enough for Gmail', () => {
  const { edition, picks } = selectEdition(input());
  const m = renderDiscoveryEdition({ edition, picks, firstName: '', links: LINKS });
  assert.match(m.html, /Hello,/);
  const visible = m.html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visible + m.text, /undefined|null|\{|\}|\[first name\]/);
  assert.ok(Buffer.byteLength(m.html) < 102 * 1024, `${Buffer.byteLength(m.html)} bytes`);
});

test('a dropped section leaves no trace', () => {
  const r = selectEdition(input({ catalogue: { ...input().catalogue, freeResources: [] } }));
  const m = renderDiscoveryEdition({ ...r, firstName: 'Sarah', links: LINKS });
  assert.doesNotMatch(m.html, /Something freely shared/);
  assert.doesNotMatch(m.text, /FREE RESOURCES/);
});

test('the admin preview hides learning picks and says so', () => {
  const r = selectEdition(input({ moreOf: [], learning: ['qigong'] }));
  assert.ok(r.picks.some((p) => p.source === 'learning'));
  const shown = renderDiscoveryEdition({ ...r, firstName: 'Sarah', links: LINKS, maskLearning: true });
  assert.doesNotMatch(shown.html, /Jeffrey Chand<\/div>/);
  assert.match(shown.html, /A pick from personal learning — not shown/);
  const real = renderDiscoveryEdition({ ...r, firstName: 'Sarah', links: LINKS });
  assert.match(real.html, /Meet Jeffrey Chand/);
});

test('the online view: no name, no "view online", no preferences or unsubscribe of its own', () => {
  const r = selectEdition(input());
  const m = renderDiscoveryEdition({ ...r, firstName: '', links: { library: LINKS.library, online: null, preferences: null, unsubscribe: null } });
  assert.match(m.html, /Hello,/);
  assert.doesNotMatch(m.html, /View this edition online|Change what I receive|Unsubscribe|token=/);
  assert.match(m.html, /Visit your Library/);
});
