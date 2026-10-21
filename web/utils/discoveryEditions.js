// SERVER ONLY (it is handed the service-role client).
//
// Building, sending, previewing and test-sending personal discovery editions
// (B3). The rules are in discoverySelect.js, the words in discoveryWords.js,
// the email in discoveryEmail.js; this file joins them to the database
// (discovery_editions, migration 0026) and to Resend.
//
// Only edition 1 (Day 10) is sent automatically for now. The monthly cadence
// after it is decided but not built: it will call sendEdition with the next
// number when a month has passed since the last one sent.

import { ADMIN_EMAIL, firstNameFrom, sendEmail } from './email.js';
import { SITE } from './emailParts.js';
import { loadPerson } from './discoveryData.js';
import { selectEdition } from './discoverySelect.js';
import { renderDiscoveryEdition } from './discoveryEmail.js';
import { isExplorerForDay4, unsubscribeHeaders, unsubscribePageUrl } from './unsubscribe.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const VIEW_DAYS = 30;

// The same people as Day 4: explorers who haven't applied, don't manage a
// listing and haven't unsubscribed.
export function mayReceive(person) {
  return Boolean(person) && isExplorerForDay4(person.profile) && !person.emailPrefs?.unsubscribed_at;
}

export function nextEditionNumber(history) {
  const sent = (history || []).filter((e) => e.status === 'sent').map((e) => e.edition_number);
  return sent.length ? Math.max(...sent) + 1 : 1;
}

export function editionLinks({ unsubscribeToken, viewToken }) {
  return {
    library: `${SITE}/library`,
    online: viewToken ? `${SITE}/editions/${viewToken}` : null,
    preferences: `${SITE}/email-preferences?token=${encodeURIComponent(unsubscribeToken)}`,
    unsubscribe: unsubscribePageUrl(unsubscribeToken),
  };
}

function choose(shared, person, userId, editionNumber) {
  return selectEdition({
    userId,
    editionNumber,
    moreOf: person.moreOf,
    hidden: person.hidden,
    learning: person.learning,
    saves: person.saves,
    area: person.area,
    places: shared.places,
    history: person.history,
    catalogue: shared.catalogue,
    saveCounts: shared.saveCounts,
    broken: shared.broken,
    today: new Date().toISOString().slice(0, 10),
  });
}

async function unsubscribeToken(supabase, userId) {
  await supabase.from('email_preferences').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  const { data } = await supabase.from('email_preferences').select('unsubscribe_token').eq('user_id', userId).maybeSingle();
  return data?.unsubscribe_token || null;
}

/**
 * Send edition `editionNumber` to one person, once. shared = loadCatalogue().
 * → { status: 'sent' | 'skipped' | 'failed' | 'not_eligible' | 'already_sent', … }
 */
export async function sendEdition(supabase, shared, userId, editionNumber) {
  const person = await loadPerson(supabase, userId);
  if (!mayReceive(person)) return { status: 'not_eligible' };
  if (person.history.some((e) => e.status === 'sent' && e.edition_number === editionNumber)) {
    return { status: 'already_sent' };
  }

  const { edition, picks, dropped, enough } = choose(shared, person, userId, editionNumber);
  if (!enough) {
    await supabase.from('discovery_editions').insert({
      user_id: userId,
      edition_number: editionNumber,
      status: 'skipped',
      status_reason: 'not_enough',
      picks,
      dropped,
    });
    return { status: 'skipped', dropped };
  }

  const token = await unsubscribeToken(supabase, userId);
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!token || !email) return { status: 'failed', error: 'no_address_or_token' };

  // THE LOCK: the row is written as sent before the email goes. The unique
  // index (one sent edition n per person) means a second run gets an error
  // here and sends nothing. If the send then fails, the row is marked failed,
  // which frees the number for tomorrow.
  const now = new Date();
  const { data: row, error: lockError } = await supabase
    .from('discovery_editions')
    .insert({
      user_id: userId,
      edition_number: editionNumber,
      status: 'sent',
      picks,
      dropped,
      sent_at: now.toISOString(),
      view_expires_at: new Date(now.getTime() + VIEW_DAYS * DAY_MS).toISOString(),
    })
    .select('id, view_token')
    .single();
  if (lockError) return { status: lockError.code === '23505' ? 'already_sent' : 'failed', error: lockError.message };

  const message = renderDiscoveryEdition({
    edition,
    picks,
    firstName: firstNameFrom(person.profile.full_name),
    links: editionLinks({ unsubscribeToken: token, viewToken: row.view_token }),
  });
  const result = await sendEmail({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: unsubscribeHeaders(token),
  });
  if (!result.sent) {
    await supabase
      .from('discovery_editions')
      .update({ status: 'failed', status_reason: String(result.error?.message || result.error || 'send_failed').slice(0, 300), sent_at: null })
      .eq('id', row.id);
    return { status: 'failed', error: result.error };
  }
  return { status: 'sent', editionId: row.id };
}

// Hide what came from learning: the team never sees it (Privacy Policy).
export function picksForTeam(picks) {
  return (picks || []).map((p) =>
    p.source === 'learning' ? { section: p.section, hidden: 'A pick from personal learning — not shown' } : p
  );
}

/** The admin's preview: the next edition, as it would be sent today, learning masked. */
export async function previewEdition(supabase, shared, userId) {
  const person = await loadPerson(supabase, userId);
  if (!person) return null;
  const editionNumber = nextEditionNumber(person.history);
  const { edition, picks, dropped, enough } = choose(shared, person, userId, editionNumber);
  const message = renderDiscoveryEdition({
    edition,
    picks,
    firstName: firstNameFrom(person.profile.full_name),
    links: editionLinks({ unsubscribeToken: 'preview', viewToken: 'preview' }),
    maskLearning: true,
  });
  return {
    editionNumber,
    eligible: mayReceive(person),
    unsubscribed: Boolean(person.emailPrefs?.unsubscribed_at),
    enough,
    dropped,
    picks: picksForTeam(picks),
    subject: message.subject,
    preheader: message.preheader,
    html: message.html,
    _message: message,
    _picks: picks,
    _dropped: dropped,
  };
}

/** A test-send of that preview: to the team's own inbox only, never the member. */
export async function testSendEdition(supabase, shared, userId) {
  const preview = await previewEdition(supabase, shared, userId);
  if (!preview) return { status: 'not_found' };
  const { _message: m } = preview;
  const result = await sendEmail({ to: ADMIN_EMAIL, subject: `[Test] ${m.subject}`, html: m.html, text: m.text });
  await supabase.from('discovery_editions').insert({
    user_id: userId,
    edition_number: preview.editionNumber,
    status: 'test',
    status_reason: result.sent ? `to ${ADMIN_EMAIL}` : 'test send failed',
    picks: preview._picks,
    dropped: preview._dropped,
  });
  return { status: result.sent ? 'sent' : 'failed', to: ADMIN_EMAIL };
}

/** The send log for one person, learning masked. */
export async function editionLog(supabase, userId) {
  const { data } = await supabase
    .from('discovery_editions')
    .select('id, edition_number, status, status_reason, picks, dropped, created_at, sent_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []).map((row) => ({ ...row, picks: picksForTeam(row.picks) }));
}
