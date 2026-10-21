// What goes in a personal discovery edition (B3): the rules, as one pure
// function. Everything it needs is passed in — the server loads it
// (utils/discoveryData.js) — so every rule is tested without a database
// (discoverySelect.test.mjs).
//
// THE RULES
//   Subjects, in order: More of; then learning's top subjects (only when the
//   person has switched learning on — the caller passes none otherwise); then,
//   with neither, the subjects of what they've saved; then the most-saved
//   subjects overall. Never show subjects are never used.
//   Nothing they've saved. Nothing carrying a Never show subject. Nothing with
//   a broken image. Not the Spiritpedia listing. No title that reads as a
//   health claim. Nothing from the last three sent editions, and never the same
//   featured discovery twice.
//   Ties: most-saved first (an anonymous count), then a shuffle fixed by the
//   person and the edition, so a preview matches what is sent. Nothing about
//   price, affiliates or commission is read.
//   A section with nothing for it is left out; the edition is only sent with a
//   featured discovery and at least two other sections.

import { NEAR_RADIUS_KM, distanceKm, offersOnline } from './area.js';
import { POPULAR_MIN_SAVES } from './discoveryWords.js';

export const MIN_OTHER_SECTIONS = 2;
export const REPEAT_WINDOW = 3;

// Titles that read as a health claim are never put in an email. Deliberately
// broad — any heal…/health word, named conditions, pain, weight loss,
// testimonials — because an email is marketing and a title is quoted as it
// stands. It leaves an item out of emails only; the website is unaffected.
const CLAIM_WORDS =
  /(\bheal\w*|\bhealth\w*|\bcur(e|es|ed|ing)\b|\btreat(s|ment|ments|ing)?\b|\bdiagnos\w*|\bdisease\w*|\bcancer|\btumou?rs?\b|\bdiabet\w*|\bdepress\w*|\banxiety|\bptsd\b|\btrauma\w*|\billness\w*|\bmedic\w*|\bprescri\w*|\bremed(y|ies)\b|\bsymptoms?\b|\barthritis|\bchronic\b|\bfatigue\b|\bpain\b|\bslipped disc|\bweight loss|\blose weight|\bimmun\w*|\bblood pressure|\binsomnia|\baddiction\w*|\btestimonial\w*)/i;
export function readsAsHealthClaim(title) {
  return CLAIM_WORDS.test(title || '');
}

// A small, stable hash → a shuffle that is the same for the same person and
// edition every time.
function seededRank(seed, key) {
  let h = 2166136261;
  const text = `${seed}:${key}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const intersects = (a, b) => (a || []).some((x) => b.has(x));

// The YouTube id in any stored platform_url shape, as the video pages read it.
export function youtubeId(url) {
  if (!url) return null;
  if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0] || null;
  return url.split('?')[0].split('/').pop() || null;
}

export function healerImage(h) {
  return (Array.isArray(h.image_urls) && h.image_urls.find(Boolean)) || h.image_url || null;
}

/**
 * @param input {
 *   userId, editionNumber,
 *   moreOf: string[], hidden: string[],
 *   learning: string[] | null      — top learned subjects, only with consent
 *   saves: [{ type, slug }],
 *   area: { lat, lng, name } | null,
 *   places: { [id]: { lat, lng, name } },
 *   history: [{ edition_number, status, picks }],   — this person's editions
 *   catalogue: { healers, videos, freeResources, subjects: { [slug]: name } },
 *   saveCounts: { healer: { [slug]: n }, video: {…}, free_resource: {…} },
 *   broken: { healer: Set, video: Set, free_resource: Set },
 *   today: 'YYYY-MM-DD'
 * }
 * @returns { edition, picks, dropped, enough }
 */
export function selectEdition(input) {
  const seed = `${input.userId}:${input.editionNumber}`;
  const hidden = new Set(input.hidden || []);
  const subjectName = (slug) => input.catalogue.subjects[slug] || null;
  const saved = new Set((input.saves || []).map((s) => `${s.type}:${s.slug}`));
  const counts = input.saveCounts || {};
  const broken = input.broken || {};

  // What earlier editions showed.
  const sent = (input.history || [])
    .filter((e) => e.status === 'sent')
    .sort((a, b) => b.edition_number - a.edition_number);
  const everFeatured = new Set();
  const recent = new Set();
  sent.forEach((e, i) => {
    for (const p of e.picks || []) {
      if (p.section === 'featured') everFeatured.add(`${p.type}:${p.ref}`);
      if (i < REPEAT_WINDOW) recent.add(`${p.type}:${p.ref}`);
    }
  });

  /* Subjects, ranked, each with where it came from. */
  const ranked = [];
  const add = (slug, source, extra = {}) => {
    if (!slug || hidden.has(slug) || !subjectName(slug) || ranked.some((r) => r.slug === slug)) return;
    ranked.push({ slug, source, ...extra });
  };
  (input.moreOf || []).forEach((s) => add(s, 'more_of'));
  (input.learning || []).forEach((s) => add(s, 'learning'));
  if (!ranked.length) {
    const fromSaves = new Map();
    const lookups = {
      healer: new Map(input.catalogue.healers.map((h) => [h.healer_slug, h])),
      video: new Map(input.catalogue.videos.map((v) => [v.slug, v])),
      free_resource: new Map(input.catalogue.freeResources.map((f) => [f.slug, f])),
    };
    for (const s of input.saves || []) {
      const item = lookups[s.type]?.get(s.slug);
      for (const slug of item?.subject_slugs || []) {
        const entry = fromSaves.get(slug) || { n: 0, savedName: item.name || item.title };
        entry.n += 1;
        fromSaves.set(slug, entry);
      }
    }
    [...fromSaves.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([slug, e]) => add(slug, 'saves', { savedName: e.savedName }));
  }
  if (!ranked.length) {
    const bySubject = new Map();
    for (const v of input.catalogue.videos) {
      for (const slug of v.subject_slugs || []) bySubject.set(slug, (bySubject.get(slug) || 0) + (counts.video?.[v.slug] || 0));
    }
    [...bySubject.entries()].sort((a, b) => b[1] - a[1]).forEach(([slug]) => add(slug, 'popular'));
  }

  /* Who and what may appear at all. */
  const used = new Set();
  const usable = (type, ref, subjects, title) =>
    !saved.has(`${type}:${ref}`) &&
    !recent.has(`${type}:${ref}`) &&
    !used.has(`${type}:${ref}`) &&
    !intersects(subjects, hidden) &&
    !broken[type]?.has(ref) &&
    !readsAsHealthClaim(title);

  const order = (type, keyOf) => (a, b) =>
    (counts[type]?.[keyOf(b)] || 0) - (counts[type]?.[keyOf(a)] || 0) ||
    seededRank(seed, keyOf(a)) - seededRank(seed, keyOf(b));

  // The reason a pick gives: its subject's source, except that "popular" needs
  // POPULAR_MIN_SAVES saves of the item itself, and is neutral otherwise.
  const reasonFor = (subject, type, ref) => {
    if (!subject) return 'neutral';
    if (subject.source === 'popular') {
      return (counts[type]?.[ref] || 0) >= POPULAR_MIN_SAVES ? 'popular' : 'neutral';
    }
    return subject.source;
  };

  const people = input.catalogue.healers.filter(
    (h) => !h.official && (h.entity_type || 'individual') === 'individual' && healerImage(h)
  );

  const picks = [];
  const dropped = {};
  const edition = { videos: [] };
  const pick = (section, type, ref, subject, extra = {}) => {
    used.add(`${type}:${ref}`);
    const p = {
      section,
      type,
      ref,
      subject: subject?.slug || null,
      source: extra.source || subject?.source || 'popular',
      reason: extra.reason,
      // What the online view needs to redraw the card exactly (hydrateEdition).
      ...(extra.savedName ? { savedName: extra.savedName } : {}),
      ...(extra.mode ? { mode: extra.mode } : {}),
      ...(extra.showSubject ? { showSubject: true } : {}),
    };
    picks.push(p);
    return p;
  };

  /* Featured: one person, in the first subject that has someone. */
  for (const subject of ranked) {
    const candidates = people
      .filter((h) => ['superhero', 'luminary', 'local_hero'].includes(h.tier))
      .filter((h) => (h.subject_slugs || []).includes(subject.slug))
      .filter((h) => !everFeatured.has(`healer:${h.healer_slug}`))
      .filter((h) => usable('healer', h.healer_slug, h.subject_slugs, h.name))
      .sort(order('healer', (h) => h.healer_slug));
    if (candidates.length) {
      const h = candidates[0];
      const reason = reasonFor(subject, 'healer', h.healer_slug);
      pick('featured', 'healer', h.healer_slug, subject, { reason, savedName: reason === 'saves' ? subject.savedName : null });
      edition.featured = { healer: h, subjectName: subjectName(subject.slug), reason, savedName: subject.savedName };
      break;
    }
  }
  if (!edition.featured) dropped.featured = ranked.length ? 'no_person_in_their_subjects' : 'no_subjects';

  /* More of what you love: two videos, different subjects where possible,
     different creators. */
  const creators = new Set();
  for (let round = 0; round < 2 && edition.videos.length < 2; round += 1) {
    for (const subject of ranked) {
      if (edition.videos.length >= 2) break;
      if (round === 0 && edition.videos.some((v) => v.subject === subject.slug)) continue;
      const v = input.catalogue.videos
        .filter((x) => (x.subject_slugs || []).includes(subject.slug))
        .filter((x) => youtubeId(x.platform_url))
        .filter((x) => !x.healer_slug || !creators.has(x.healer_slug))
        .filter((x) => usable('video', x.slug, x.subject_slugs, x.title))
        .sort(order('video', (x) => x.slug))[0];
      if (!v) continue;
      const reason = reasonFor(subject, 'video', v.slug);
      pick('videos', 'video', v.slug, subject, { reason: reason === 'saves' ? 'neutral' : reason });
      if (v.healer_slug) creators.add(v.healer_slug);
      const creator = input.catalogue.healers.find((h) => h.healer_slug === v.healer_slug);
      edition.videos.push({
        video: v,
        subject: subject.slug,
        subjectName: subjectName(subject.slug),
        reason: reason === 'saves' ? 'neutral' : reason,
        creatorName: creator?.name || null,
      });
    }
  }
  if (!edition.videos.length) dropped.videos = 'no_videos_in_their_subjects';

  /* A little closer to home: a Local Hero within reach of their area; with no
     area, someone in their subjects who offers sessions online. */
  if (input.area) {
    const near = people
      .filter((h) => h.tier === 'local_hero')
      .map((h) => ({ h, town: input.places[h.place_id] }))
      .filter(({ town }) => town && distanceKm(input.area, town) <= NEAR_RADIUS_KM)
      .filter(({ h }) => usable('healer', h.healer_slug, h.subject_slugs, h.name));
    const rank = (h) => {
      const i = ranked.findIndex((s) => (h.subject_slugs || []).includes(s.slug));
      return i < 0 ? ranked.length : i;
    };
    near.sort((a, b) => rank(a.h) - rank(b.h) || order('healer', (x) => x.healer_slug)(a.h, b.h));
    const found = near[0];
    if (found) {
      const subject = ranked[rank(found.h)] || null;
      pick('nearby', 'healer', found.h.healer_slug, subject, {
        source: 'area',
        reason: 'area',
        mode: 'area',
        showSubject: subject?.source === 'more_of',
      });
      edition.nearby = {
        healer: found.h,
        mode: 'area',
        town: found.town.name,
        subjectName: subject?.source === 'more_of' ? subjectName(subject.slug) : null,
      };
    } else dropped.nearby = 'nobody_near_their_area';
  } else {
    let found = null;
    for (const subject of ranked) {
      const h = people
        .filter((x) => x.tier !== 'ascended_master' && offersOnline(x))
        .filter((x) => (x.subject_slugs || []).includes(subject.slug))
        .filter((x) => usable('healer', x.healer_slug, x.subject_slugs, x.name))
        .sort(order('healer', (x) => x.healer_slug))[0];
      if (h) {
        found = { h, subject };
        break;
      }
    }
    if (found) {
      pick('nearby', 'healer', found.h.healer_slug, found.subject, { source: 'online', reason: 'online', mode: 'online' });
      edition.nearby = { healer: found.h, mode: 'online', subjectName: subjectName(found.subject.slug) };
    } else dropped.nearby = 'no_area_and_nobody_online';
  }

  /* A voice worth discovering: an Ascended Master, in their subjects first. */
  const teachers = people.filter((h) => h.tier === 'ascended_master');
  let teacher = null;
  for (const subject of ranked) {
    const h = teachers
      .filter((x) => (x.subject_slugs || []).includes(subject.slug))
      .filter((x) => usable('healer', x.healer_slug, x.subject_slugs, x.name))
      .sort(order('healer', (x) => x.healer_slug))[0];
    if (h) {
      teacher = { h, subject };
      break;
    }
  }
  if (!teacher) {
    const h = teachers
      .filter((x) => usable('healer', x.healer_slug, x.subject_slugs, x.name))
      .sort(order('healer', (x) => x.healer_slug))[0];
    if (h) teacher = { h, subject: null };
  }
  if (teacher) {
    pick('teacher', 'healer', teacher.h.healer_slug, teacher.subject, {
      reason: teacher.subject ? 'subject' : 'any',
      source: teacher.subject?.source || 'popular',
    });
    edition.teacher = { healer: teacher.h, subjectName: teacher.subject ? subjectName(teacher.subject.slug) : null };
  } else dropped.teacher = 'no_teacher_left';

  /* Something freely shared: one real free resource in their subjects. */
  const live = (f) =>
    f.is_active !== false &&
    f.slug &&
    (!f.start_date || f.start_date <= input.today) &&
    (!f.end_date || f.end_date >= input.today);
  let free = null;
  for (const subject of ranked) {
    const f = input.catalogue.freeResources
      .filter(live)
      .filter((x) => (x.subject_slugs || []).includes(subject.slug))
      .filter((x) => usable('free_resource', x.slug, x.subject_slugs, x.title))
      .sort(order('free_resource', (x) => x.slug))[0];
    if (f) {
      free = { f, subject };
      break;
    }
  }
  if (free) {
    pick('free', 'free_resource', free.f.slug, free.subject, { reason: 'subject' });
    edition.free = { resource: free.f, subjectName: subjectName(free.subject.slug) };
  } else dropped.free = 'no_free_resource_in_their_subjects';

  const others = ['videos', 'nearby', 'teacher', 'free'].filter((s) =>
    s === 'videos' ? edition.videos.length > 0 : Boolean(edition[s])
  ).length;
  const enough = Boolean(edition.featured) && others >= MIN_OTHER_SECTIONS;

  return { edition, picks, dropped, enough };
}

// Redraw an edition from its stored picks (discovery_editions.picks), for
// "View this edition online". Anything removed from Spiritpedia since simply
// drops out. Same shape as selectEdition's edition.
export function hydrateEdition(picks, catalogue, places = {}) {
  const healers = new Map(catalogue.healers.map((h) => [h.healer_slug, h]));
  const videos = new Map(catalogue.videos.map((v) => [v.slug, v]));
  const free = new Map(catalogue.freeResources.map((f) => [f.slug, f]));
  const name = (slug) => (slug ? catalogue.subjects[slug] || null : null);
  const edition = { videos: [] };
  for (const p of picks || []) {
    if (p.section === 'featured' && healers.has(p.ref)) {
      edition.featured = { healer: healers.get(p.ref), subjectName: name(p.subject), reason: p.reason, savedName: p.savedName };
    } else if (p.section === 'videos' && videos.has(p.ref)) {
      const v = videos.get(p.ref);
      edition.videos.push({
        video: v,
        subject: p.subject,
        subjectName: name(p.subject),
        reason: p.reason,
        creatorName: healers.get(v.healer_slug)?.name || null,
      });
    } else if (p.section === 'nearby' && healers.has(p.ref)) {
      const h = healers.get(p.ref);
      edition.nearby = {
        healer: h,
        mode: p.mode || 'area',
        town: places[h.place_id]?.name || null,
        subjectName: p.mode === 'online' ? name(p.subject) : p.showSubject ? name(p.subject) : null,
      };
    } else if (p.section === 'teacher' && healers.has(p.ref)) {
      edition.teacher = { healer: healers.get(p.ref), subjectName: name(p.subject) };
    } else if (p.section === 'free' && free.has(p.ref)) {
      edition.free = { resource: free.get(p.ref), subjectName: name(p.subject) };
    }
  }
  // An area card whose practitioner has lost their town can't say where.
  if (edition.nearby?.mode === 'area' && !edition.nearby.town) delete edition.nearby;
  return edition;
}
