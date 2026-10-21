import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hydrateEdition, readsAsHealthClaim, selectEdition, youtubeId } from './discoverySelect.js';
import { featuredWhy, introLine, previewLine, videoWhy } from './discoveryWords.js';

const LONDON = { lat: 51.5074, lng: -0.1278, name: 'London' };
const places = { 1: { lat: 51.52, lng: -0.1, name: 'London' }, 2: { lat: 53.48, lng: -2.24, name: 'Manchester' } };
const person = (slug, tier, subjects, extra = {}) => ({
  healer_slug: slug,
  name: extra.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  tier,
  subject_slugs: subjects,
  entity_type: 'individual',
  image_url: `https://img.test/${slug}.jpg`,
  availability_type: extra.availability_type || 'Local Only (In-Person)',
  place_id: extra.place_id ?? null,
  official: false,
  ...extra,
});
const video = (slug, subjects, healer, title = slug) => ({
  slug,
  title,
  subject_slugs: subjects,
  healer_slug: healer,
  platform_url: `https://www.youtube.com/watch?v=${slug}`,
});
const free = (slug, subjects, extra = {}) => ({ slug, title: slug, subject_slugs: subjects, is_active: true, ...extra });

function base(overrides = {}) {
  return {
    userId: 'u1',
    editionNumber: 1,
    moreOf: ['qigong', 'consciousness'],
    hidden: [],
    learning: null,
    saves: [],
    area: LONDON,
    places,
    history: [],
    today: '2026-11-01',
    saveCounts: { healer: {}, video: {}, free_resource: {} },
    broken: {},
    catalogue: {
      subjects: { qigong: 'Qigong', consciousness: 'Consciousness', eft: 'EFT', reiki: 'Reiki' },
      healers: [
        person('jeffrey-chand', 'superhero', ['qigong']),
        person('karina-grant', 'local_hero', ['eft', 'qigong'], { place_id: 1 }),
        person('far-away', 'local_hero', ['qigong'], { place_id: 2 }),
        person('online-olly', 'local_hero', ['consciousness'], { availability_type: 'Worldwide (Online Sessions)' }),
        person('alan-watts', 'ascended_master', ['consciousness']),
        person('reiki-rita', 'superhero', ['reiki']),
      ],
      videos: [
        video('thoughts', ['consciousness'], 'eckhart-tolle'),
        video('breathing', ['qigong'], 'kim-eng'),
        video('more-qigong', ['qigong'], 'kim-eng'),
      ],
      freeResources: [free('qigong-starter', ['qigong'])],
    },
    ...overrides,
  };
}

test('the full edition from the design: every section, enough to send', () => {
  const { edition, picks, enough, dropped } = selectEdition(base());
  assert.equal(enough, true);
  assert.deepEqual(dropped, {});
  assert.equal(edition.featured.healer.healer_slug, 'jeffrey-chand');
  assert.equal(edition.featured.reason, 'more_of');
  assert.equal(edition.videos.length, 2);
  assert.deepEqual(edition.videos.map((v) => v.subject).sort(), ['consciousness', 'qigong'], 'two different subjects');
  assert.equal(new Set(edition.videos.map((v) => v.video.healer_slug)).size, 2, 'two different creators');
  assert.equal(edition.nearby.healer.healer_slug, 'karina-grant');
  assert.equal(edition.nearby.mode, 'area');
  assert.equal(edition.teacher.healer.healer_slug, 'alan-watts');
  assert.equal(edition.free.resource.slug, 'qigong-starter');
  assert.equal(new Set(picks.map((p) => `${p.type}:${p.ref}`)).size, picks.length, 'nothing twice');
  assert.equal(
    introLine(edition),
    "A little Qigong, a voice worth returning to, and someone closer to home. I've brought together a few places for your curiosity to wander."
  );
  assert.match(previewLine(edition), /^Meet Jeffrey Chand, and a little more (Qigong|Consciousness)\.$/);
});

test('never anything they have saved', () => {
  const { edition } = selectEdition(base({ saves: [{ type: 'healer', slug: 'jeffrey-chand' }, { type: 'video', slug: 'breathing' }] }));
  assert.notEqual(edition.featured?.healer.healer_slug, 'jeffrey-chand');
  assert.ok(!edition.videos.some((v) => v.video.slug === 'breathing'));
});

test('Never show wins everywhere, even over More of', () => {
  const { edition } = selectEdition(base({ hidden: ['qigong'] }));
  const all = [edition.featured?.healer, edition.nearby?.healer, edition.teacher?.healer].filter(Boolean);
  assert.ok(all.every((h) => !h.subject_slugs.includes('qigong')));
  assert.ok(edition.videos.every((v) => !v.video.subject_slugs.includes('qigong')));
  assert.equal(edition.free, undefined);
});

test('no repeats: a featured discovery never again; others not within three editions', () => {
  const first = selectEdition(base());
  const history = [{ edition_number: 1, status: 'sent', picks: first.picks }];
  const second = selectEdition(base({ editionNumber: 2, history }));
  const firstRefs = new Set(first.picks.map((p) => `${p.type}:${p.ref}`));
  for (const p of second.picks) assert.ok(!firstRefs.has(`${p.type}:${p.ref}`), `${p.ref} repeated`);
  const muchLater = selectEdition(
    base({
      editionNumber: 6,
      history: [
        { edition_number: 1, status: 'sent', picks: first.picks },
        { edition_number: 2, status: 'sent', picks: [] },
        { edition_number: 3, status: 'sent', picks: [] },
        { edition_number: 4, status: 'sent', picks: [] },
      ],
    })
  );
  assert.notEqual(muchLater.edition.featured?.healer.healer_slug, 'jeffrey-chand', 'featured never again');
  assert.equal(muchLater.edition.teacher?.healer.healer_slug, 'alan-watts', 'others come back after three');
});

test('skipped editions do not count as shown', () => {
  const first = selectEdition(base());
  const again = selectEdition(base({ history: [{ edition_number: 1, status: 'skipped', picks: first.picks }] }));
  assert.equal(again.edition.featured.healer.healer_slug, 'jeffrey-chand');
});

test('"popular" lines only with 10+ saves of the item; otherwise neutral', () => {
  const noTailor = { moreOf: [], learning: null, saves: [] };
  const few = selectEdition(base({ ...noTailor, saveCounts: { healer: { 'jeffrey-chand': 9, 'reiki-rita': 3 }, video: { breathing: 9, 'more-qigong': 2 } } }));
  assert.equal(few.edition.featured.reason, 'neutral');
  assert.equal(featuredWhy({ ...few.edition.featured, name: few.edition.featured.healer.name }), 'Someone to explore in Qigong.');
  const many = selectEdition(base({ ...noTailor, saveCounts: { healer: { 'jeffrey-chand': 10 }, video: { breathing: 10 } } }));
  assert.equal(many.edition.featured.reason, 'popular');
  assert.equal(
    featuredWhy({ ...many.edition.featured, name: many.edition.featured.healer.name }),
    "Many explorers interested in Qigong have saved Jeffrey's work."
  );
  assert.equal(videoWhy({ reason: 'neutral', subjectName: 'Qigong' }), 'Picked for Qigong.');
});

test('learning only when passed (the caller passes it only with consent)', () => {
  const withLearning = selectEdition(base({ moreOf: [], learning: ['reiki'] }));
  assert.equal(withLearning.edition.featured.healer.healer_slug, 'reiki-rita');
  assert.equal(withLearning.picks.find((p) => p.section === 'featured').source, 'learning');
  const without = selectEdition(base({ moreOf: [], learning: null }));
  assert.ok(without.picks.every((p) => p.source !== 'learning'));
});

test('saves give the subjects when nothing else does, naming what was saved', () => {
  const { edition } = selectEdition(base({ moreOf: [], saves: [{ type: 'video', slug: 'thoughts' }] }));
  assert.equal(edition.featured.healer.healer_slug, 'online-olly');
  assert.equal(edition.featured.reason, 'saves');
  assert.equal(
    featuredWhy({ ...edition.featured, name: edition.featured.healer.name }),
    "Because you saved thoughts, here's someone else exploring Consciousness."
  );
});

test('no area: someone online in their subjects; nobody near: the section is left out', () => {
  const noArea = selectEdition(base({ area: null }));
  assert.equal(noArea.edition.nearby.mode, 'online');
  assert.equal(noArea.edition.nearby.healer.healer_slug, 'online-olly');
  const nowhere = selectEdition(base({ area: { lat: 0, lng: 0, name: 'Nowhere' } }));
  assert.equal(nowhere.edition.nearby, undefined);
  assert.equal(nowhere.dropped.nearby, 'nobody_near_their_area');
});

test('the minimum: featured plus two other sections, or it is not sent', () => {
  const thin = base();
  thin.catalogue = { ...thin.catalogue, videos: [], freeResources: [], healers: thin.catalogue.healers.filter((h) => h.tier !== 'ascended_master') };
  const r = selectEdition(thin);
  assert.ok(r.edition.featured && r.edition.nearby);
  assert.equal(r.enough, false, 'featured + nearby is only one other section');
  const noFeatured = base();
  noFeatured.catalogue = { ...noFeatured.catalogue, healers: noFeatured.catalogue.healers.filter((h) => h.tier === 'ascended_master') };
  const r2 = selectEdition(noFeatured);
  assert.equal(r2.edition.featured, undefined);
  assert.ok(r2.edition.videos.length && r2.edition.teacher && r2.edition.free, 'three other sections');
  assert.equal(r2.enough, false, 'no featured discovery: not sent, however much else');
});

test('health claims, broken images, inactive or expired resources and the Spiritpedia listing are never picked', () => {
  assert.equal(readsAsHealthClaim('Qigong to cure anxiety'), true);
  assert.equal(readsAsHealthClaim('Heal your gut in 7 days'), true);
  assert.equal(readsAsHealthClaim('Where Do Our Thoughts Come From?'), false);
  for (const real of [
    'Healing arthritis naturally',
    'Overcome chronic fatigue using the Self Created Health techniques',
    'How Quantum-Touch healed my slipped disc - testimonial',
    'Hypnosis for Weight Loss (Guided Relaxation, Healthy Diet, Sleep & Motivation)',
    '1 Hour Sleep Hypnosis: Higher Self Healing for Depression & Anxiety',
    'Healing Trauma: Sleep Meditation & Mindful Movement',
  ]) assert.equal(readsAsHealthClaim(real), true, real);
  for (const fine of ['Guided Breathing Meditation With Kim Eng', 'The Experience of Death and Dying', 'Liberating Our Thoughts']) {
    assert.equal(readsAsHealthClaim(fine), false, fine);
  }
  const input = base();
  input.catalogue = {
    ...input.catalogue,
    videos: [video('claims', ['qigong'], 'x', 'Qigong treatment for depression'), ...input.catalogue.videos],
    freeResources: [free('old', ['qigong'], { end_date: '2026-10-01' }), free('off', ['qigong'], { is_active: false })],
    healers: [person('spiritpedia', 'superhero', ['qigong'], { official: true }), ...input.catalogue.healers],
  };
  input.broken = { healer: new Set(['jeffrey-chand']) };
  const { edition } = selectEdition(input);
  assert.ok(!edition.videos.some((v) => v.video.slug === 'claims'));
  assert.equal(edition.free, undefined);
  assert.ok(!['spiritpedia', 'jeffrey-chand'].includes(edition.featured?.healer.healer_slug));
});

test('the same person and edition always get the same picks', () => {
  const a = selectEdition(base()).picks;
  const b = selectEdition(base()).picks;
  assert.deepEqual(a, b);
});

test('youtube ids from every stored shape', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=abc123&t=4'), 'abc123');
  assert.equal(youtubeId('https://youtu.be/abc123'), 'abc123');
  assert.equal(youtubeId(null), null);
});

test('an edition redrawn from its stored picks matches what was sent; removed items drop out', () => {
  const input = base();
  const { edition, picks } = selectEdition(input);
  const again = hydrateEdition(JSON.parse(JSON.stringify(picks)), input.catalogue, input.places);
  assert.equal(introLine(again), introLine(edition));
  assert.equal(previewLine(again), previewLine(edition));
  assert.equal(again.nearby.town, 'London');
  assert.deepEqual(again.videos.map((v) => v.video.slug), edition.videos.map((v) => v.video.slug));
  const smaller = { ...input.catalogue, healers: input.catalogue.healers.filter((h) => h.healer_slug !== 'alan-watts') };
  assert.equal(hydrateEdition(picks, smaller, input.places).teacher, undefined);
});
