import { Resend } from 'resend';

// SERVER ONLY. Never import this from a client component — RESEND_API_KEY has
// no NEXT_PUBLIC_ prefix, so it would be undefined in the browser, and the
// import itself would pull the SDK into a public bundle.
//
// WHAT THIS DOES NOT DO: it does not affect the sign-in code emails. Those are
// sent by Supabase Auth from inside Supabase's own infrastructure, which has no
// visibility of this file. Routing them through Resend is a Supabase-side
// setting, not an application dependency — see the note in utils/supabaseAuth.js.
//
// This client is for email Spiritpedia sends itself: practitioner approval and
// rejection notices, admin replies to messages, mailshots.
export const resend = new Resend(process.env.RESEND_API_KEY);
