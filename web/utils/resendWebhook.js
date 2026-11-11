import { createHmac, timingSafeEqual } from 'node:crypto';

// SERVER ONLY. Resend's webhooks (delivered and bounced, owner 11 Nov 2026)
// are signed the Svix way, and this is the check, with no SDK:
//
//   signed  = `${svix-id}.${svix-timestamp}.${raw body}`
//   key     = the secret after "whsec_", base64-decoded
//   valid   = some "v1,<base64 HMAC-SHA256>" in svix-signature matches
//
// The timestamp must be within five minutes either way, so a captured request
// cannot be replayed later. The body must be the raw text: parsing and
// re-serialising it would change the bytes that were signed.

export const TOLERANCE_SECONDS = 5 * 60;

export function signPayload(secret, id, timestamp, body) {
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

// → true only for a correctly signed, recent request.
export function verifyWebhook({ secret, id, timestamp, signature, body, now = Date.now() }) {
  if (!secret || !id || !timestamp || !signature || typeof body !== 'string') return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signPayload(secret, id, timestamp, body));
  return String(signature)
    .split(' ')
    .map((part) => part.split(','))
    .some(([version, value]) => {
      if (version !== 'v1' || !value) return false;
      const given = Buffer.from(value);
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

// What a Resend event means for journey_messages, or null for one we do not
// track (opened, clicked, sent, complained …: delivered and bounced only).
export function messageUpdate(event) {
  const at = event?.created_at || event?.data?.created_at || new Date().toISOString();
  if (event?.type === 'email.delivered') return { delivered_at: at };
  if (event?.type === 'email.bounced') {
    return { bounced_at: at, bounce_type: event?.data?.bounce?.type || null };
  }
  return null;
}

// A permanent bounce means the address will never take mail: the journey
// stops as suppressed, as it would if Resend's suppression list said so first.
export function isPermanentBounce(update) {
  return Boolean(update?.bounced_at) && /permanent|hard/i.test(update.bounce_type || '');
}
