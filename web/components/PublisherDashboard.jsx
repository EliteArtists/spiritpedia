'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseAuth } from '../utils/supabaseAuth.js';
import DeleteAccount from './DeleteAccount.jsx';
import OwnContent from './OwnContent.jsx';

// A publisher's dashboard (migration 0020): its description and website, which
// it may change itself (/api/publisher/profile), and since 0024 the books it
// adds for its authors (OwnContent). The name, logo and the authors it
// publishes are changed by Spiritpedia, on request.

const SUPPORT_EMAIL = 'love@spiritpedia.co';
const input =
  'w-full rounded-xl border border-white/15 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none';

async function call(method, body) {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch('/api/publisher/profile', {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({ error: 'unreadable' }));
}

export default function PublisherDashboard() {
  const [publisher, setPublisher] = useState(null);
  const [problem, setProblem] = useState(null);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    call('GET').then((json) => {
      if (cancelled) return;
      if (!json.publisher) {
        setProblem('We couldn’t load your listing. Please try again in a moment.');
        return;
      }
      setPublisher(json.publisher);
      setDescription(json.publisher.description || '');
      setWebsite(json.publisher.website_url || '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const json = await call('PATCH', { description, website_url: website });
    setSaving(false);
    setMessage(json.ok ? 'Saved. Your listing is updated.' : json.message || 'We couldn’t save that. Please try again.');
  }, [saving, description, website]);

  if (problem) return <p className="text-sm text-gray-400">{problem}</p>;
  if (!publisher) return <p className="text-sm text-gray-500">Loading your listing…</p>;

  return (
    <div className="text-left">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111827] p-5">
        {publisher.logo_url && (
          <img src={publisher.logo_url} alt="" className="h-14 w-14 rounded-xl border border-white/10 object-cover" />
        )}
        <div>
          <p className="text-lg font-bold text-white">{publisher.name}</p>
          <Link href={`/publishers/${publisher.slug}`} className="text-sm text-[#a78bfa] hover:text-white">
            View your public listing →
          </Link>
        </div>
      </div>

      <label htmlFor="pub-description" className="mt-8 block text-sm font-medium text-gray-300">
        Description
      </label>
      <textarea
        id="pub-description"
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`mt-2 resize-y ${input}`}
      />

      <label htmlFor="pub-website" className="mt-6 block text-sm font-medium text-gray-300">
        Website
      </label>
      <input
        id="pub-website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://yourpress.com"
        className={`mt-2 ${input}`}
      />

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-full bg-[#7c3aed] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {message && <p className="mt-3 text-sm text-gray-400">{message}</p>}

      <p className="mt-8 text-sm leading-relaxed text-gray-500">
        To change your name or logo, or the authors listed with you, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 hover:text-white">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-10 border-t border-white/10 pt-8">
        <h2 className="mb-5 text-lg font-semibold text-white">Your books</h2>
        <OwnContent as="publisher" />
      </div>

      <div className="mt-8">
        <DeleteAccount hasListing />
      </div>
    </div>
  );
}
