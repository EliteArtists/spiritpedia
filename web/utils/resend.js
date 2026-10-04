import { Resend } from 'resend';

// SERVER ONLY. Never import this from a client component — RESEND_API_KEY has
// no NEXT_PUBLIC_ prefix, so it would be undefined in the browser, and the
// import itself would pull the SDK into a public bundle.
//
// LAZY, AND THAT IS THE WHOLE POINT. This used to construct the client at
// module load:
//
//   export const resend = new Resend(process.env.RESEND_API_KEY);
//
// Next.js evaluates API route modules during `next build`, before the runtime
// environment exists, so the key was undefined and the constructor threw
// "Missing API key" — failing the production build rather than any request.
// Deferring construction to the first send moves that moment to runtime, where
// the variable is actually set.
//
// The instance is cached after the first call, so this is one client per server
// process exactly as before.
//
// WHAT THIS DOES NOT DO: it does not affect the sign-in code emails. Those are
// sent by Supabase Auth from inside Supabase's own infrastructure, which has no
// visibility of this file. Routing them through Resend is a Supabase-side
// setting, not an application dependency — see the note in utils/supabaseAuth.js.
//
// This client is for email Spiritpedia sends itself: welcomes, review notices,
// admin replies to messages, mailshots.
let client = null;

export function getResend() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
