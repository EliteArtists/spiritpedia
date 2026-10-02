'use client';

import { createClient } from '@supabase/supabase-js';

// Authentication — email OTP only. No passwords, no social providers.
//
// A SEPARATE client from utils/supabase.js, and deliberately so. That one is
// the anonymous data client shared with server components and must never hold a
// session; this one is browser-only and does. Two clients, two jobs.
//
// WHERE THE SESSION LIVES. In localStorage, under the storage key below, put
// there by supabase-js. That has one consequence worth stating plainly: the
// server cannot see it. Server components and proxy.js have no idea who the
// visitor is, so a protected page cannot be guarded by redirecting before it
// renders — it has to mount, ask, and then redirect. Guards are client-side.
// If server-side knowledge of the user is wanted later (middleware protection,
// personalised SSR), that means moving the session into cookies via
// @supabase/ssr, which is a swap of this file rather than a rewrite of what
// calls it.
//
// Every helper resolves to { data, error } rather than throwing, matching the
// shape supabase-js itself returns, so callers handle one pattern throughout.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key. Check your .env.local file.');
}

// Named so a future cookie-backed client can be told apart from anything this
// one left behind in a returning visitor's browser.
const STORAGE_KEY = 'spiritpedia-auth';

export const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: STORAGE_KEY,
    // The OTP flow types a code; it never lands back on the site carrying one.
    // Left on regardless, so that if the email template is ever switched to a
    // magic link, clicking it still signs the visitor in instead of silently
    // doing nothing.
    detectSessionInUrl: true,
  },
});

// Normalise what the user typed. Trailing spaces from an autofill and a
// capitalised first letter from a phone keyboard are the two ways a correct
// address is rejected, and both are ours to absorb rather than theirs to fix.
function cleanEmail(email) {
  return (email || '').trim().toLowerCase();
}

// STEP 1 of signing in: send the code.
//
// `shouldCreateUser: true` is what makes this registration as well as sign-in —
// a first-time address becomes an auth user on verification. There is no
// separate sign-up call, and deliberately so: asking someone whether they
// already have an account is a question they often cannot answer.
//
// The response is intentionally identical for a known and an unknown address.
// Anything else turns this endpoint into a way to ask the site whether a given
// person has an account.
export async function signInWithOtp(email) {
  const address = cleanEmail(email);
  if (!address) {
    return { data: null, error: { message: 'Please enter your email address.' } };
  }

  // emailRedirectTo decides where the magic link in that same email lands. Left
  // unset, Supabase sends it to the project's Site URL — the production
  // homepage — which on localhost means the link leaves the machine you are
  // testing on, and in production means the verify page never runs and nobody
  // is routed by their practitioner choice. window.location.origin sends people
  // back where they started. The URL must be allow-listed in Supabase under
  // Authentication -> URL Configuration, or it silently falls back to Site URL.
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/verify?email=${encodeURIComponent(address)}`
      : undefined;

  const { data, error } = await supabaseAuth.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });

  return { data, error };
}

// STEP 2: exchange the emailed code for a session.
//
// type 'email' is the one that accepts a code typed by hand. ('magiclink'
// verifies a token lifted from a clicked URL and rejects a typed code.)
//
// Codes are six digits, but they are stripped of spaces rather than validated
// here — Supabase is the authority on whether a code is good, and a local
// length check would only produce a second, less accurate error message.
export async function verifyOtp(email, token) {
  const address = cleanEmail(email);
  const code = (token || '').replace(/\s/g, '');

  if (!address || !code) {
    return { data: null, error: { message: 'Enter the code we emailed you.' } };
  }

  const { data, error } = await supabaseAuth.auth.verifyOtp({
    email: address,
    token: code,
    type: 'email',
  });

  return { data, error };
}

// Ends the session in this browser and clears the stored token.
export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut();
  return { data: null, error };
}

// The stored session, or null. Reads localStorage — fast, no network, and fine
// for "is someone signed in here?".
//
// Do NOT trust it for anything that grants access. It is whatever is in the
// browser's own storage, which the person sitting at the browser can edit. Use
// getUser() where the answer matters; use this where a wrong answer costs
// nothing worse than a redirect.
export async function getSession() {
  const { data, error } = await supabaseAuth.auth.getSession();
  return { data: data?.session ?? null, error };
}

// The authenticated user, verified against Supabase rather than read from
// storage. A network round trip, and the one to use before showing anyone
// anything that is theirs. Returns null when nobody is signed in — which is an
// answer, not a failure, so no error is surfaced for it.
export async function getUser() {
  const { data, error } = await supabaseAuth.auth.getUser();
  if (error) {
    const missing = error.name === 'AuthSessionMissingError' || error.status === 401;
    return { data: null, error: missing ? null : error };
  }
  return { data: data?.user ?? null, error: null };
}
