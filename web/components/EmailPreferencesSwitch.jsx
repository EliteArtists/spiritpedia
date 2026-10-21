'use client';

import { useEffect, useId, useState } from 'react';
import { supabaseAuth } from '../utils/supabaseAuth.js';

// "Discovery emails": Day 4 and the personal editions, on or off
// (email_preferences, migration 0025). Account and review emails are not
// affected, and the switch says so.
//
// Two ways in, the same switch:
//   on the account page — signed in, through /api/account/email-preferences;
//   from "Change what I receive" in an email — emailToken, through
//   /api/email/preferences, no sign-in needed.
async function call(emailToken, on) {
  if (emailToken) {
    const res = await fetch('/api/email/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeof on === 'boolean' ? { token: emailToken, on } : { token: emailToken }),
    });
    return res.ok ? res.json() : null;
  }
  const { data } = await supabaseAuth.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const res = await fetch('/api/account/email-preferences', {
    method: typeof on === 'boolean' ? 'PUT' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(typeof on === 'boolean' ? { body: JSON.stringify({ on }) } : {}),
  });
  return res.ok ? res.json() : null;
}

export default function EmailPreferencesSwitch({ emailToken = null }) {
  const [on, setOn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const labelId = useId();

  useEffect(() => {
    let cancelled = false;
    call(emailToken).then((json) => {
      if (cancelled) return;
      if (json) setOn(Boolean(json.on));
      else setMessage('We couldn’t load this just now. Please try again later.');
    });
    return () => {
      cancelled = true;
    };
  }, [emailToken]);

  const flip = async () => {
    if (saving || on === null) return;
    const next = !on;
    setSaving(true);
    setMessage(null);
    const json = await call(emailToken, next);
    setSaving(false);
    if (!json) {
      setMessage('That didn’t save. Please try again.');
      return;
    }
    setOn(next);
    setMessage(next ? 'On. Discoveries will reach you again.' : 'Off. You won’t receive any more discovery emails.');
  };

  return (
    <div id="emails" className="rounded-2xl border border-white/10 bg-[#111827] p-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id={labelId} className="text-sm font-semibold text-white">
            Discovery emails
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            An introduction a few days after you join, then personal editions of discoveries. Emails about
            your account and your reviews still reach you either way.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(on)}
          aria-labelledby={labelId}
          disabled={on === null || saving}
          onClick={flip}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? 'bg-[#7c3aed]' : 'bg-white/15'
          }`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-gray-400">{message}</p>}
    </div>
  );
}
