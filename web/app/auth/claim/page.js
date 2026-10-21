'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import ListingBadges from '@/components/ListingBadges';
import { supabase } from '@/utils/supabase';
import { supabaseAuth, getUser } from '@/utils/supabaseAuth';

const SETUP_PATH = '/auth/practitioner-setup';

// Tell the website something happened to this account. The route identifies
// the account from this session's own token, never from the body.
async function notify(path, body) {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return;
  await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  });
}

// The practitioner welcome waits while a matching listing is on offer
// (/api/email/practitioner-welcome). Not claiming it — "This isn't me", or a
// claim that fails — releases it. Sent once, however often this runs.
function releaseWelcome() {
  notify('/api/email/practitioner-welcome', { afterClaim: true }).catch(() => {});
}

function ClaimForm() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = (params.get('slug') || '').trim();
  // A publisher (migration 0020) or, as before, a healer of any kind.
  const isPublisher = params.get('kind') === 'publisher';

  const [healer, setHealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  // Signed in with an address that isn't the listing's: they can still ask.
  const [mismatch, setMismatch] = useState(false);

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
      // Signed out — an outreach email's claim link, usually. Through sign-up
      // as a practitioner, carrying the listing, and back here after the code.
      if (!user) {
        const kind = isPublisher ? '&kind=publisher' : '';
        router.replace(`/auth/signup?as=practitioner&claim=${encodeURIComponent(slug)}${kind}`);
        return;
      }

      // Read through the anonymous client: healers are public, and this needs
      // no privileges the visitor does not already have as a reader.
      // Publishers are shaped into the same card: name, logo, no tier.
      const { data } = isPublisher
        ? await supabase
            .from('publishers')
            .select('name, slug, logo_url, tier, verified')
            .eq('slug', slug)
            .maybeSingle()
            .then(({ data: p }) => ({
              data: p && {
                name: p.name,
                healer_slug: p.slug,
                image_url: p.logo_url,
                tier: p.tier,
                verified: p.verified,
                entity_type: 'publisher',
              },
            }))
        : await supabase
            .from('healers')
            .select('name, healer_slug, tier, entity_type, verified, official, image_urls, image_url, city, country')
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
  }, [slug, isPublisher, router]);

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
    // claim_publisher_profile() is the same check against a publisher.
    const { error: rpcError } = await supabaseAuth.rpc(
      isPublisher ? 'claim_publisher_profile' : 'claim_healer_profile',
      { p_slug: healer.healer_slug }
    );

    if (rpcError) {
      setMismatch(Boolean(rpcError.message?.includes('does not match')));
      releaseWelcome();
      setError(
        rpcError.message?.includes('does not match')
          ? 'That profile does not match your email address.'
          : rpcError.message || 'We could not complete that. Please try again.'
      );
      setClaiming(false);
      return;
    }

    // "You can now manage …" (D7): their welcome as well.
    notify('/api/email/claim-approved').catch(() => {});
    router.replace('/account');
  }, [claiming, healer, isPublisher, router]);

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
          {/* The badges visitors see on the listing (utils/badges.js). */}
          <ListingBadges listing={healer} size="profile" align="left" className="justify-center" />
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
          {claiming ? 'Claiming…' : isPublisher ? 'Yes, this is us →' : 'Yes, this is me →'}
        </button>

        <button
          type="button"
          onClick={() => {
            releaseWelcome();
            router.replace(SETUP_PATH);
          }}
          disabled={claiming}
          className="w-full rounded-full border border-white/20 px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/5 disabled:opacity-50"
        >
          {isPublisher ? 'This isn’t us' : 'This isn’t me'} — continue setup
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-sm leading-relaxed text-red-400">
          {error}
        </p>
      )}
      {mismatch && (
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          If it&rsquo;s yours, you can{' '}
          <a href="/auth/claim-request" className="font-semibold text-white underline">
            ask us to check and link it to your account
          </a>
          .
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
