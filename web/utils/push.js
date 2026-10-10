// Push notifications — the only place one is sent. Server only.
//
// Firebase Cloud Messaging's HTTP v1 API, authorised with the Firebase
// project's service account (Vercel env, never in the app or the browser):
//
//   FIREBASE_PROJECT_ID     e.g. spiritpedia
//   FIREBASE_CLIENT_EMAIL   firebase-adminsdk-…@….iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY    the PEM key; "\n" escapes are accepted
//
// No SDK: the OAuth token is a JWT signed here with node:crypto and swapped at
// Google's token endpoint, so nothing new is installed for one POST.
//
// Plain ES module with injectable `fetch` and `env`, so `node --test` can run
// it without a network (utils/push.test.mjs).

import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

// The brand colour on Android, and the channel every General notification uses
// (the app creates it on first launch; "iam_affirmations" comes later).
const ANDROID_COLOR = '#7C3AED';
export const CHANNELS = { general: 'general' };

export const WELCOME = {
  title: 'Welcome to Spiritpedia ✨',
  body: 'I’m your guiding star — your saved teachers, books and videos are with you wherever you go.',
  data: { route: '/library' },
};

// The service account from env, or null if any part is missing. Vercel stores
// a pasted multi-line key either with real newlines or as literal "\n".
export function pushConfig(env = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const base64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// The signed assertion Google's token endpoint exchanges for an access token.
export function buildAssertion({ clientEmail, privateKey }, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(privateKey).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${claims}.${signature}`;
}

// Access tokens last an hour; reused across requests on a warm server.
let cached = null;

async function accessToken(config, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.clientEmail === config.clientEmail && cached.expiresAt - 60 > now) {
    return cached.token;
  }
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildAssertion(config, now),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`push auth failed (${res.status})`);
  cached = { token: json.access_token, expiresAt: now + (json.expires_in || 3600), clientEmail: config.clientEmail };
  return cached.token;
}

// One FCM message. `data` values must be strings (an FCM rule).
export function buildMessage(token, { title, body, data = {}, channel = CHANNELS.general }) {
  return {
    message: {
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: {
        priority: 'high',
        notification: { channel_id: channel, color: ANDROID_COLOR, icon: 'ic_notification' },
      },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  };
}

// A token Firebase says will never work again: the app was uninstalled, or the
// token was rotated. Anything else (quota, a server blip) is not the token's
// fault and leaves it in place.
export function isDeadToken(status, errorBody) {
  if (status === 404) return true;
  const details = errorBody?.error?.details || [];
  const fcmCode = details.find((d) => d?.errorCode)?.errorCode;
  if (fcmCode === 'UNREGISTERED') return true;
  return status === 400 && fcmCode === 'INVALID_ARGUMENT' && /registration token/i.test(errorBody?.error?.message || '');
}

// Send to one token → 'sent' | 'dead' | 'failed'.
export async function sendToToken(token, notification, { config, fetchImpl = fetch } = {}) {
  const auth = await accessToken(config, fetchImpl);
  const res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildMessage(token, notification)),
  });
  if (res.ok) return 'sent';
  const errorBody = await res.json().catch(() => ({}));
  return isDeadToken(res.status, errorBody) ? 'dead' : 'failed';
}

// Does this account want this category? No preferences row means the defaults:
// general on, IAM affirmations off.
export async function wantsCategory(supabase, userId, category) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('general, iam_affirmations')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return category === 'general';
  return Boolean(data[category]);
}

// Send to every device of one account, honouring their preferences, and remove
// tokens Firebase reports dead. `supabase` is the service-role client.
// → { configured, sent, failed, removed, skipped? }
export async function sendToUser(supabase, userId, notification, { category = 'general', env, fetchImpl = fetch } = {}) {
  const config = pushConfig(env);
  if (!config) return { configured: false, sent: 0, failed: 0, removed: 0 };
  if (!(await wantsCategory(supabase, userId, category))) {
    return { configured: true, sent: 0, failed: 0, removed: 0, skipped: 'opted_out' };
  }
  const { data: rows } = await supabase.from('push_tokens').select('id, token').eq('user_id', userId);
  let sent = 0;
  let failed = 0;
  const dead = [];
  for (const row of rows || []) {
    let outcome;
    try {
      outcome = await sendToToken(row.token, notification, { config, fetchImpl });
    } catch {
      outcome = 'failed';
    }
    if (outcome === 'sent') sent += 1;
    else if (outcome === 'dead') dead.push(row.id);
    else failed += 1;
  }
  if (dead.length) await supabase.from('push_tokens').delete().in('id', dead);
  return { configured: true, sent, failed, removed: dead.length };
}

// The welcome notification — once ever per account, at the first opt-in.
//
// Order matters. Nothing is recorded unless there is something to send to (a
// device, push configured, General on), so an account that has not opted in
// yet still gets it later. Then the once-only row is inserted BEFORE sending:
// the unique (user_id, kind) constraint means a second caller — another
// device, a retry, the welcome-email route — fails the insert and sends
// nothing. If every send then fails, the row is removed so a later attempt can
// try again.
// → { status: 'sent' | 'already_sent' | 'no_devices' | 'opted_out' | 'not_configured' | 'failed', ... }
export async function sendWelcomePush(supabase, userId, { env, fetchImpl = fetch } = {}) {
  if (!pushConfig(env)) return { status: 'not_configured' };

  const { count } = await supabase
    .from('push_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (!count) return { status: 'no_devices' };
  if (!(await wantsCategory(supabase, userId, 'general'))) return { status: 'opted_out' };

  const { data: claim, error: claimError } = await supabase
    .from('notification_sends')
    .insert({ user_id: userId, kind: 'welcome' })
    .select('id')
    .single();
  if (claimError) {
    return claimError.code === '23505' ? { status: 'already_sent' } : { status: 'failed', error: 'claim_failed' };
  }

  const result = await sendToUser(supabase, userId, WELCOME, { env, fetchImpl });
  if (result.sent === 0) {
    await supabase.from('notification_sends').delete().eq('id', claim.id);
    return { status: 'failed', ...result };
  }
  return { status: 'sent', ...result };
}
