import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExplorerForDay4, isToken, unsubscribeHeaders, unsubscribePageUrl } from './unsubscribe.js';
import { explorerDay4 } from './emailTemplates.js';

const TOKEN = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

test('Day 4: explorers only; never an applicant, a declined one, or an owner', () => {
  const explorer = { user_type: 'explorer', verification_status: 'pending' };
  assert.equal(isExplorerForDay4(explorer), true);
  assert.equal(isExplorerForDay4({ ...explorer, user_type: 'practitioner' }), false);
  assert.equal(isExplorerForDay4({ ...explorer, verification_status: 'rejected' }), false);
  assert.equal(isExplorerForDay4({ ...explorer, linked_healer_slug: 'jane' }), false);
  assert.equal(isExplorerForDay4({ ...explorer, linked_publisher_id: 'x' }), false);
  assert.equal(isExplorerForDay4(null), false);
});

test('one-click unsubscribe headers and the page link carry the token', () => {
  const h = unsubscribeHeaders(TOKEN);
  assert.equal(h['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.match(h['List-Unsubscribe'], new RegExp(`^<https://www\\.spiritpedia\\.co/api/email/unsubscribe\\?token=${TOKEN}>, <mailto:love@spiritpedia\\.co\\?subject=Unsubscribe>$`));
  assert.equal(unsubscribePageUrl(TOKEN), `https://www.spiritpedia.co/unsubscribe?token=${TOKEN}`);
  assert.equal(isToken(TOKEN), true);
  assert.equal(isToken('nope'), false);
  assert.equal(isToken(undefined), false);
});

test('B2: the approved wording, bold headings, the button, and the unsubscribe line', () => {
  const m = explorerDay4({ firstName: 'Sam', unsubscribeUrl: unsubscribePageUrl(TOKEN) });
  assert.equal(m.subject, 'Follow the superheroes. Discover your local heroes.');
  assert.match(m.text, /^Hi Sam,\n\nLet me introduce you/);
  assert.match(m.text, /Superheroes\nA worldwide reach/);
  assert.match(m.text, /Local Heroes\nPractitioners available in your area\./);
  assert.match(m.text, /Explore Spiritpedia: https:\/\/www\.spiritpedia\.co\//);
  assert.match(m.text, /See you among the stars,\n\nYour Guiding Star\nand the Spiritpedia Constellation\n\n—\nYou're receiving this because you have a Spiritpedia account\. Unsubscribe from these emails: https:\/\/www\.spiritpedia\.co\/unsubscribe\?token=/);
  assert.match(m.html, /<strong>Luminaries<\/strong><br>/);
  assert.match(m.html, /font-size:12px[^>]*>You're|font-size:12px[^>]*>You&#39;re/);
  assert.match(explorerDay4({ unsubscribeUrl: 'u' }).text, /^Hello,/);
});
