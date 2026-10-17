'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { supabase } from '@/utils/supabase';
import { getUser, supabaseAuth } from '@/utils/supabaseAuth';

// "Is your work already on Spiritpedia? Request to claim it."
//
// For anyone whose sign-in email did not match their listing — most YouTube
// channels use Gmail. They pick the listing (a healer of any kind, or a
// publisher) and say how they are connected. The request lands in the admin
// Inbox (claim_requests, migration 0020), where the admin confirms it by
// emailing the listing's own published address, or failing that a code in the
// channel's About text, and approves it there. Nothing is linked from here.

const inputClass =
  'w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

const KIND_WORDS = {
  individual: 'Practitioner',
  channel: 'Channel',
  app: 'App',
  organisation: 'Organisation',
};

export default function ClaimRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [connection, setConnection] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const searchRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data) router.replace('/auth/signup');
      else setUser(data);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Listings are public, so the search reads them anonymously, as the site
  // does. A pause after typing, and no "nothing found" while it is on its way.
  const search = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    // Letters, digits, spaces and a little punctuation: it goes into a pattern.
    const q = value.trim().replace(/[^\p{L}\p{N}\s\-'&.]/gu, '');
    const mine = ++searchRef.current;
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const [{ data: healers }, { data: publishers }] = await Promise.all([
        supabase.from('healers').select('name, healer_slug, entity_type, city, country').ilike('name', `%${q}%`).limit(8),
        supabase.from('publishers').select('name, slug').ilike('name', `%${q}%`).limit(4),
      ]);
      if (mine !== searchRef.current) return;
      setResults([
        ...(healers || []).map((h) => ({
          key: `h:${h.healer_slug}`,
          name: h.name,
          healerSlug: h.healer_slug,
          kind: KIND_WORDS[h.entity_type] || 'Practitioner',
          place: [h.city, h.country].filter(Boolean).join(', '),
        })),
        ...(publishers || []).map((p) => ({
          key: `p:${p.slug}`,
          name: p.name,
          publisherSlug: p.slug,
          kind: 'Publisher',
          place: '',
        })),
      ]);
      setSearching(false);
    }, 250);
  };

  const send = async (event) => {
    event.preventDefault();
    if (sending || !chosen || !user) return;
    const text = connection.trim();
    if (!text) {
      setError('Please tell us how you’re connected to this listing.');
      return;
    }
    setError(null);
    setSending(true);

    let publisherId = null;
    if (chosen.publisherSlug) {
      const { data } = await supabase.from('publishers').select('id').eq('slug', chosen.publisherSlug).maybeSingle();
      publisherId = data?.id || null;
    }

    const { error: insertError } = await supabaseAuth.from('claim_requests').insert({
      user_id: user.id,
      healer_slug: chosen.healerSlug || null,
      publisher_id: publisherId,
      connection: text.slice(0, 1000),
    });

    setSending(false);
    if (insertError) {
      // One open request per person per listing (a unique index).
      setError(
        insertError.code === '23505'
          ? 'You’ve already asked to claim this listing. We’ll be in touch by email.'
          : 'We couldn’t send that. Please try again.'
      );
      return;
    }
    setSent(true);
  };

  if (!user) {
    return (
      <AuthShell>
        <p className="mt-8 text-sm text-gray-500">Loading…</p>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell>
        <h1 className="mt-8 text-2xl font-bold leading-snug">Thank you. We’ve got your request.</h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-400">
          To keep listings safe, we’ll confirm it with the contact details published for{' '}
          <span className="font-semibold text-white">{chosen.name}</span>, then email you at{' '}
          <span className="font-semibold text-white">{user.email}</span>. This usually takes a few days.
        </p>
        <Link
          href="/account"
          className="mt-8 inline-block w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#6d28d9]"
        >
          Go to my account →
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell maxWidthClass="max-w-xl">
      <h1 className="mt-8 text-3xl font-bold">Claim your listing</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        Find your work on Spiritpedia and tell us how you’re connected. We’ll confirm it and email you.
      </p>

      <form onSubmit={send} className="mt-8 text-left" noValidate>
        {!chosen ? (
          <>
            <label htmlFor="listing-search" className="block text-sm font-medium text-gray-300">
              Your name, or your work’s name
            </label>
            <input
              id="listing-search"
              type="text"
              autoFocus
              autoComplete="off"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="e.g. The Shift Network"
              className={`mt-2 ${inputClass}`}
            />
            <ul className="mt-2 max-h-80 overflow-y-auto">
              {results.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => setChosen(r)}
                    className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
                  >
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-gray-400"> · {[r.kind, r.place].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="mt-2 text-sm text-gray-400">
                Nothing by that name yet.{' '}
                <Link href="/auth/practitioner-setup" className="font-semibold text-[#a78bfa] hover:text-white">
                  Add your work instead →
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111827] px-4 py-3">
              <p className="text-sm text-white">
                <span className="font-semibold">{chosen.name}</span>
                <span className="text-gray-400"> · {chosen.kind}</span>
              </p>
              <button
                type="button"
                onClick={() => setChosen(null)}
                className="text-sm text-gray-400 underline-offset-2 hover:text-white hover:underline"
              >
                Change
              </button>
            </div>

            <label htmlFor="connection" className="mt-6 block text-sm font-medium text-gray-300">
              How are you connected to it?
            </label>
            <p className="mt-1 text-xs text-gray-500">
              (For example: “It’s my channel”, or “I run their marketing”)
            </p>
            <textarea
              id="connection"
              rows={4}
              maxLength={1000}
              value={connection}
              onChange={(e) => setConnection(e.target.value)}
              className={`mt-2 resize-y ${inputClass}`}
            />

            <button
              type="submit"
              disabled={sending || !connection.trim()}
              className="mt-6 w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Request to claim →'}
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm leading-relaxed text-red-400">
            {error}
          </p>
        )}
      </form>
    </AuthShell>
  );
}
