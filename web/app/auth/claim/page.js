'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { supabase } from '@/utils/supabase';
import { supabaseAuth, getUser } from '@/utils/supabaseAuth';

const SETUP_PATH = '/auth/practitioner-setup';

// Tier badges, matching the styling HealerCard uses on the shelves so the
// profile a practitioner is being shown looks like the one visitors see.
const TIER_BADGES = {
  superhero: {
    label: 'Superhero',
    className: 'bg-amber-100 text-amber-600 border border-amber-300',
  },
  luminary: { label: 'Luminary', className: 'bg-violet-600 text-white' },
  local_hero: { label: 'Local Hero', className: 'bg-emerald-500 text-white' },
  ascended_master: { label: 'Ascended Master', className: 'bg-[#fef08a] text-[#78350f]' },
};

function TierBadge({ tier }) {
  // An unrecognised or NULL tier gets the same neutral badge the cards use,
  // rather than borrowing another tier's colours and mislabelling the profile.
  const badge = TIER_BADGES[tier] || { label: 'Teacher', className: 'bg-gray-500 text-white' };
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function ClaimForm() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = (params.get('slug') || '').trim();

  const [healer, setHealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  // No slug, no healer, or nobody signed in — there is nothing to claim, so
  // send them to the ordinary setup route rather than showing an empty card.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slug) {
        router.replace(SETUP_PATH);
        return;
      }

      const { data: user } = await getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/auth/signup');
        return;
      }

      // Read through the anonymous client: healers are public, and this needs
      // no privileges the visitor does not already have as a reader.
      const { data } = await supabase
        .from('healers')
        .select('name, healer_slug, tier, image_urls, image_url, city, country')
        .eq('healer_slug', slug)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        router.replace(SETUP_PATH);
        return;
      }

      setHealer(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  const claim = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    setError(null);

    // Routed through a database function, NOT a direct update.
    //
    // user_profiles carries a trigger that pins linked_healer_slug and
    // verification_status against ordinary callers — without it a practitioner
    // could approve themselves, or claim any profile, from the browser console.
    // A plain .update() here would be accepted, return 200, and silently change
    // nothing, which is the worst of both worlds. claim_healer_profile()
    // re-checks the email against the healer server side and is the only path
    // permitted to write those two fields.
    const { error: rpcError } = await supabaseAuth.rpc('claim_healer_profile', {
      p_slug: healer.healer_slug,
    });

    if (rpcError) {
      setError(
        rpcError.message?.includes('does not match')
          ? 'That profile does not match your email address.'
          : rpcError.message || 'We could not complete that. Please try again.'
      );
      setClaiming(false);
      return;
    }

    router.replace('/account');
  }, [claiming, healer, router]);

  if (loading) {
    return (
      <AuthShell>
        <p className="mt-8 text-sm text-gray-500">Finding your profile…</p>
      </AuthShell>
    );
  }

  const portrait =
    (Array.isArray(healer.image_urls) && healer.image_urls.find(Boolean)) ||
    healer.image_url ||
    '/avatar-placeholder.svg';
  const place = [healer.city, healer.country].filter(Boolean).join(', ');

  return (
    <AuthShell>
      <h1 className="mt-8 text-2xl font-bold leading-snug">We found your Spiritpedia profile.</h1>

      <div className="mt-8 rounded-3xl border border-white/10 bg-[#111827] p-8">
        <img
          src={portrait}
          alt={healer.name}
          className="mx-auto h-28 w-28 rounded-full border border-white/10 object-cover"
        />
        <p className="mt-5 text-xl font-bold text-white">{healer.name}</p>
        {place && <p className="mt-1 text-xs text-gray-500">{place}</p>}
        <div className="mt-3">
          <TierBadge tier={healer.tier} />
        </div>
      </div>

      <p className="mt-8 text-sm leading-relaxed text-gray-400">
        Does this look right? Would you like to claim this profile?
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={claim}
          disabled={claiming}
          className="w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {claiming ? 'Claiming…' : 'Yes, this is me →'}
        </button>

        <button
          type="button"
          onClick={() => router.replace(SETUP_PATH)}
          disabled={claiming}
          className="w-full rounded-full border border-white/20 px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
        >
          This isn&apos;t me — continue setup
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-sm leading-relaxed text-red-400">
          {error}
        </p>
      )}
    </AuthShell>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="mt-8 text-sm text-gray-500">Loading…</p>
        </AuthShell>
      }
    >
      <ClaimForm />
    </Suspense>
  );
}
