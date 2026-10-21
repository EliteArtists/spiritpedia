// The pieces every Spiritpedia email is built from, so the greeting, the
// sign-offs, the buttons and the escaping are decided once
// (docs/email-copy-2026-10-21.md). Plain functions with no imports, so the
// templates are tested without Resend (emailParts.test.mjs).

// Every link in every email. The www host is the site's canonical address
// (utils/seo.js); the bare domain only redirects to it.
export const SITE = 'https://www.spiritpedia.co';

// "Hi Jane," with a first name, "Hello," without one. Never "Hi there", never
// an empty placeholder, and a name is never required to send.
export function greeting(firstName) {
  const name = (firstName || '').trim();
  return name ? `Hi ${name},` : 'Hello,';
}

// The three ways an email ends.
//   team  — the Spiritpedia team, warmly ("we")
//   star  — the Guiding Star ("I")
//   plain — a decision or a notice, without "With love"
export const SIGN_OFFS = {
  team: ['With love,', 'The Spiritpedia team'],
  star: ['Your Guiding Star ✦', 'and the Spiritpedia Constellation'],
  starFarewell: ['See you among the stars,', '', 'Your Guiding Star ✦', 'and the Spiritpedia Constellation'],
  plain: ['The Spiritpedia team'],
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A link drawn as a button. Inline styles only: mail clients drop <style>.
const BUTTON_STYLE = [
  'display:inline-block',
  'padding:12px 22px',
  'border-radius:999px',
  'background:#5b3fb5',
  'color:#ffffff',
  'text-decoration:none',
  'font-weight:600',
].join(';');

// Blocks, in order, become the plain-text and HTML bodies together:
//   'A paragraph.'                  — a paragraph; '\n' inside is a line break
//   { heading: 'Superheroes' }      — a bold line that sits on the paragraph after it
//   { button: 'Label', url }        — a button; in text, "Label: url" on its own line
// Everything is escaped for the HTML; nothing a member typed can become markup.
export function renderEmail({ subject, blocks, signOff = 'team' }) {
  const ending = SIGN_OFFS[signOff];
  if (!ending) throw new Error(`unknown sign-off ${signOff}`);

  const text = [];
  const html = [];
  let heading = null;

  for (const block of blocks) {
    if (block === null || block === undefined || block === false) continue;
    if (typeof block === 'string') {
      if (heading) {
        text.push(`${heading}\n${block}`);
        html.push(`<p><strong>${escapeHtml(heading)}</strong><br>${lines(block)}</p>`);
        heading = null;
      } else {
        text.push(block);
        html.push(`<p>${lines(block)}</p>`);
      }
    } else if (block.heading) {
      heading = block.heading;
    } else if (block.button) {
      text.push(`${block.button}: ${block.url}`);
      html.push(
        `<p><a href="${escapeHtml(block.url)}" style="${BUTTON_STYLE}">${escapeHtml(block.button)}</a></p>`
      );
    } else {
      throw new Error('unknown email block');
    }
  }

  text.push(ending.join('\n'));
  html.push(`<p>${ending.map(escapeHtml).join('<br>').replace(/(<br>){2}/g, '</p><p>')}</p>`);

  return { subject, text: text.join('\n\n'), html: html.join('') };
}

function lines(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}
