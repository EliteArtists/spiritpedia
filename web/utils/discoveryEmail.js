// The personal discovery edition as an email (B3), drawn from
// Spiritpedia_Personal_Email_Preview.png. → { subject, preheader, html, text }.
//
// Built for mail clients, not browsers: tables, inline styles, a 600px card,
// real text for every heading (so it reads with images off), a button Outlook
// on Windows can draw, and dark colours declared so Apple Mail doesn't invert
// them. Every link goes to a Spiritpedia page — no affiliate links, ever
// (discoveryEmail.test.mjs checks). Pure: no data loading, no sending.
//
// maskLearning (the admin's preview and log): a pick that came from activity
// learning is replaced by a note, because the Privacy Policy promises that
// what is learned is never shown to the team.

import { SITE, escapeHtml, greeting } from './emailParts.js';
import { tierName } from './badges.js';
import { healerImage, youtubeId } from './discoverySelect.js';
import {
  CLOSING,
  FOOTER,
  HEADLINE,
  KICKER,
  LABELS,
  SUBJECT_LINE,
  featuredButton,
  featuredWhy,
  freeWhy,
  introLine,
  nearbyWhy,
  previewLine,
  teacherWhy,
  videoWhy,
} from './discoveryWords.js';

const C = {
  page: '#e5e7eb',
  card: '#0a0e18',
  panel: '#111827',
  line: '#1f2937',
  white: '#f8fafc',
  body: '#cbd5e1',
  muted: '#94a3b8',
  violet: '#a78bfa',
  button: '#7c3aed',
  gold: '#e6b450',
  featured: '#1e1538',
  freePanel: '#0f2a22',
  freeLine: '#1f4d3a',
  freeLabel: '#6ee7b7',
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const itemUrl = {
  healer: (slug) => `${SITE}/healers/${encodeURIComponent(slug)}`,
  video: (slug) => `${SITE}/videos/${encodeURIComponent(slug)}`,
  free_resource: (slug) => `${SITE}/free-resources/${encodeURIComponent(slug)}`,
};

const e = escapeHtml;
const kicker = (text, color = C.violet) =>
  `<div style="font-family:${FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${color};margin:0 0 6px">${e(text)}</div>`;
const title = (text, size = 22) =>
  `<div style="font-family:${FONT};font-size:${size}px;line-height:1.3;color:${C.white};margin:0 0 14px">${e(text)}</div>`;
const para = (text, color = C.body, size = 15) =>
  `<div style="font-family:${FONT};font-size:${size}px;line-height:1.6;color:${color};margin:0 0 8px">${e(text)}</div>`;
const link = (text, url) =>
  `<a href="${e(url)}" style="font-family:${FONT};font-size:14px;color:${C.violet};text-decoration:none">${e(text)}</a>`;
const img = (src, alt, width, height, extra = '') =>
  `<img src="${e(src)}" alt="${e(alt)}" width="${width}" height="${height}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;background:${C.line};${extra}">`;

function button(text, url) {
  // VML for Outlook on Windows, which can't round an <a>; everyone else gets
  // the plain pill.
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${e(url)}" style="height:44px;v-text-anchor:middle;width:240px" arcsize="50%" fillcolor="${C.button}" stroke="f"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px">${e(text)}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${e(url)}" style="display:inline-block;background:${C.button};color:#ffffff;font-family:${FONT};font-size:15px;text-decoration:none;padding:12px 24px;border-radius:999px">${e(text)}</a><!--<![endif]-->`;
}

const section = (kick, heading, body, right = '') => `
<tr><td style="padding:28px 32px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td>${kicker(kick)}${title(heading)}</td>
    ${right ? `<td align="right" valign="bottom" style="padding-bottom:14px">${para(right, C.violet, 14)}</td>` : ''}
  </tr></table>
  ${body}
</td></tr>`;

const panel = (inner, bg = C.panel, border = C.line) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid ${border};border-radius:14px;border-collapse:separate"><tr>${inner}</tr></table>`;

const masked = `<tr><td style="padding:28px 32px 0">${panel(
  `<td style="padding:18px 20px">${para('A pick from personal learning — not shown (the Privacy Policy promises the team never sees what is learned).', C.muted, 13)}</td>`
)}</td></tr>`;

// A person beside a square picture: the nearby and teacher cards.
function personCard(h, label, why, linkText) {
  const url = itemUrl.healer(h.healer_slug);
  const pic = healerImage(h);
  return panel(`
    <td width="120" valign="top" style="width:120px">${pic ? `<a href="${e(url)}">${img(pic, h.name, 120, 160, 'border-radius:14px 0 0 14px;object-fit:cover')}</a>` : ''}</td>
    <td valign="top" style="padding:16px 20px">
      ${kicker(label)}${title(h.name, 18)}${para(why)}
      ${link(linkText, url)} &nbsp; ${link(LABELS.save, url)}
    </td>`);
}

/**
 * edition, picks: from selectEdition. firstName: '' for the online view.
 * links: { library, online, preferences, unsubscribe }. On the online page
 * itself only library is given: the rest belong to the inbox it went to.
 */
export function renderDiscoveryEdition({ edition, picks = [], firstName, links, maskLearning = false }) {
  const isLearning = (section, ref) =>
    maskLearning && picks.some((p) => p.section === section && p.ref === ref && p.source === 'learning');
  const preheader = previewLine(edition);
  const rows = [];
  const text = [greeting(firstName), introLine(edition)];

  /* Featured */
  if (edition.featured) {
    const { healer: h, subjectName, reason, savedName } = edition.featured;
    if (isLearning('featured', h.healer_slug)) rows.push(masked);
    else {
      const url = itemUrl.healer(h.healer_slug);
      const why = featuredWhy({ reason, subjectName, name: h.name, savedName });
      const tier = tierName(h.tier, h.entity_type);
      const pic = healerImage(h);
      // The photo beside the text rather than a full-width banner: most
      // listing photos are small portraits from other sites, which blur and
      // stretch when drawn wide. (Copying them into our own storage, cropped,
      // is a separate project.)
      rows.push(`<tr><td style="padding:24px 32px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.featured};border-radius:16px;border-collapse:separate"><tr>
          ${pic ? `<td class="stackpad" width="170" valign="top" style="width:170px;padding:22px 0 22px 22px"><a href="${e(url)}">${img(pic, h.name, 148, 148, 'border-radius:12px')}</a></td>` : ''}
          <td class="stackpad" valign="top" style="padding:22px 26px 24px 20px">
            ${kicker(LABELS.featured(tier), C.gold)}${title(`Meet ${h.name}`, 24)}${para(why)}
            <div style="margin-top:16px">${button(featuredButton(h.name), url)}</div>
          </td>
        </tr></table></td></tr>`);
      text.push(`${LABELS.featured(tier).toUpperCase()}\nMeet ${h.name}\n${why}\n${featuredButton(h.name)} ${url}`);
    }
  }

  /* More of what you love */
  const videos = edition.videos || [];
  if (videos.length) {
    const sameSubject = videos.every((v) => v.subject === videos[0].subject) ? videos[0].subjectName : '';
    const cells = videos.map((v) => {
      if (isLearning('videos', v.video.slug)) {
        return `<td class="stack" width="50%" valign="top" style="padding:0 6px">${panel(`<td style="padding:16px">${para('A pick from personal learning — not shown.', C.muted, 13)}</td>`)}</td>`;
      }
      const url = itemUrl.video(v.video.slug);
      const id = youtubeId(v.video.platform_url);
      const why = videoWhy({ reason: v.reason, subjectName: v.subjectName });
      text.push(`${LABELS.video.toUpperCase()}${sameSubject ? '' : ` · ${v.subjectName}`}\n${v.video.title}\n${v.creatorName || ''}\n${why}\n${LABELS.exploreVideo} ${url}`.replace(/\n\n/g, '\n'));
      return `<td class="stack" width="50%" valign="top" style="padding:0 6px">${panel(`<td valign="top">
          ${id ? `<a href="${e(url)}">${img(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, v.video.title, 260, 146, 'border-radius:14px 14px 0 0;max-width:100%')}</a>` : ''}
          <div style="padding:14px 16px 16px">
            ${kicker(sameSubject ? LABELS.video : `${LABELS.video} · ${v.subjectName}`)}${title(v.video.title, 16)}
            ${v.creatorName ? para(v.creatorName, C.muted, 13) : ''}${para(why, C.body, 14)}
            ${link(LABELS.exploreVideo, url)} &nbsp; ${link(LABELS.save, url)}
          </div></td>`)}</td>`;
    });
    rows.push(section(LABELS.videosKicker, LABELS.videosTitle,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join('')}</tr></table>`,
      sameSubject));
  }

  /* A little closer to home */
  if (edition.nearby) {
    const { healer: h, mode, town, subjectName } = edition.nearby;
    if (isLearning('nearby', h.healer_slug)) rows.push(masked);
    else {
      const why = nearbyWhy({ mode, subjectName, town, name: h.name });
      const label = mode === 'online' ? 'Practitioner · Online sessions' : 'Practitioner';
      rows.push(section(LABELS.nearbyKicker(mode, town), LABELS.nearbyTitle, personCard(h, label, why, LABELS.meet(h.name))));
      text.push(`${LABELS.nearbyKicker(mode, town).toUpperCase()}\n${h.name}\n${why}\n${LABELS.meet(h.name)} ${itemUrl.healer(h.healer_slug)}`);
    }
  }

  /* A voice worth discovering */
  if (edition.teacher) {
    const { healer: h, subjectName } = edition.teacher;
    if (isLearning('teacher', h.healer_slug)) rows.push(masked);
    else {
      const why = teacherWhy({ subjectName });
      const label = subjectName ? `Teacher · ${subjectName}` : 'Teacher';
      rows.push(section(LABELS.teacherKicker, LABELS.teacherTitle, personCard(h, label, why, LABELS.teacherLink)));
      text.push(`${LABELS.teacherKicker.toUpperCase()}\n${h.name}\n${why}\n${LABELS.teacherLink} ${itemUrl.healer(h.healer_slug)}`);
    }
  }

  /* Something freely shared */
  if (edition.free) {
    const { resource: f, subjectName } = edition.free;
    if (isLearning('free', f.slug)) rows.push(masked);
    else {
      const url = itemUrl.free_resource(f.slug);
      const why = freeWhy({ subjectName });
      rows.push(section(LABELS.freeKicker, LABELS.freeTitle, panel(`<td style="padding:20px 24px">
        ${kicker(LABELS.freeLabel(subjectName), C.freeLabel)}${title(f.title, 18)}${para(why)}
        ${link(LABELS.freeLink, url)} &nbsp; ${link(LABELS.save, url)}</td>`, C.freePanel, C.freeLine)));
      text.push(`${LABELS.freeLabel(subjectName).toUpperCase()}\n${f.title}\n${why}\n${LABELS.freeLink} ${url}`);
    }
  }

  text.push(`${CLOSING}\n\nYour Guiding Star ✦\nand the Spiritpedia Constellation`);
  const footerLinks = [
    [FOOTER.library, links.library],
    links.online ? [FOOTER.online, links.online] : null,
    links.preferences ? [FOOTER.preferences, links.preferences] : null,
    links.unsubscribe ? [FOOTER.unsubscribe, links.unsubscribe] : null,
  ].filter(Boolean);
  text.push(`—\n${footerLinks.map(([t, u]) => `${t}: ${u}`).join('\n')}\n${FOOTER.line}`);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${e(SUBJECT_LINE)}</title>
<style>
:root{color-scheme:dark;supported-color-schemes:dark}
@media (max-width:620px){.stack{display:block!important;width:100%!important;padding:0 0 12px!important}.pad{padding-left:20px!important;padding-right:20px!important}.stackpad{display:block!important;width:auto!important;padding:20px 20px 4px!important}}
</style></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${e(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:100%;max-width:600px;background:${C.card};border-radius:18px;border-collapse:separate">
<tr><td class="pad" style="padding:26px 32px;border-bottom:1px solid ${C.line}">
  <span style="font-family:${SERIF};font-size:30px;color:${C.gold};vertical-align:middle">✦</span>
  <span style="font-family:${SERIF};font-size:28px;color:${C.white};vertical-align:middle">&nbsp;Spiritpedia</span>
  <div style="font-family:${FONT};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};margin:4px 0 0 34px">${e(FOOTER.tagline)}</div>
</td></tr>
<tr><td class="pad" style="padding:28px 32px 0">
  ${kicker(KICKER)}
  <div style="font-family:${SERIF};font-size:34px;line-height:1.2;color:${C.white};margin:0 0 20px">${e(HEADLINE)}</div>
  ${para(greeting(firstName), C.white, 16)}${para(introLine(edition), C.body, 16)}
</td></tr>
${rows.join('\n')}
<tr><td class="pad" style="padding:36px 36px 30px">
  ${para(CLOSING, C.body, 17)}
  <div style="font-family:${SERIF};font-size:20px;color:${C.gold};margin:14px 0 6px">Your Guiding Star ✦</div>
  ${para('and the Spiritpedia Constellation', C.body, 16)}
</td></tr>
<tr><td align="center" style="padding:22px 32px 28px;border-top:1px solid ${C.line}">
  <div style="font-family:${FONT};font-size:13px;line-height:2;color:${C.muted}">${footerLinks
    .map(([t, u]) => `<a href="${e(u)}" style="color:${C.muted};text-decoration:underline">${e(t)}</a>`)
    .join(' &nbsp;·&nbsp; ')}</div>
  <div style="font-family:${FONT};font-size:12px;color:${C.muted};margin-top:6px">${e(FOOTER.line)}</div>
</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: SUBJECT_LINE, preheader, html, text: text.join('\n\n') };
}
