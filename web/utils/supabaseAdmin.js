import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, computeSessionToken } from './adminAuth.js';

// SERVER ONLY. Never import this from a client component.
//
// The admin dashboard needs to read every user_profiles row and to write the
// two columns the field-protection trigger pins. RLS grants a signed-in user
// their own row and nothing else, and the trigger refuses those columns to any
// ordinary API caller — both correctly. The dashboard is therefore not an
// ordinary caller: it runs its reads and writes here, on the server, with the
// service role key, which bypasses RLS and which the trigger lets through.
//
// That key must never reach the browser. It carries no prefix that Next would
// inline into client bundles, and it is read here in route handlers only.

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The dashboard is gated by proxy.js, but an API route under /api is outside
// that matcher, so each one re-checks the same cookie for itself. Without this
// the routes below would be an unauthenticated read of every account on the
// platform.
export async function isAdminRequest() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  return token === (await computeSessionToken(process.env.ADMIN_PASSWORD));
}

// A single shape for "the service role key is not configured", so the UI can
// say so plainly instead of rendering an empty list that looks like real data.
export const NOT_CONFIGURED = {
  error: 'service_role_missing',
  message:
    'SUPABASE_SERVICE_ROLE_KEY is not set. Account data cannot be read without it.',
};
