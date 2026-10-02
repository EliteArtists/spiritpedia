'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';
import { getUser, signOut, supabaseAuth } from '@/utils/supabaseAuth';

const SUPPORT_EMAIL = 'love@spiritpedia.co';

// What each verification state means to the person waiting on it. Kept together
// so the three cases read as one set and none can quietly drift in tone.
const STATUS_NOTICES = {
  pending: {
    className: 'border-amber-400/30 bg-amber-400/5 text-amber-200',
    title: 'Your profile is under review',
    body: 'We are reading it properly. You will hear from us within a few days.',
  },
  approved: {
    className: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
    title: 'Your profile is live',
    body: 'Your practice is listed on Spiritpedia.',
  },
  rejected: {
    className: 'border-red-400/30 bg-red-400/5 text-red-200',
    title: 'Your application was not approved',
    body: `Contact us at ${SUPPORT_EMAIL} and we will look at it again.`,
    // A rejection should not read as a closed door. The setup form loads their
    // existing answers, so this is an edit rather than starting again.
    footnote: 'You can update your details and resubmit at any time.',
    action: { href: '/auth/practitioner-setup', label: 'Update and resubmit →' },
  },
};

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'checking' });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // getUser() rather than getSession(): this page decides whether to show
      // someone their own account, so the answer has to come from Supabase
      // rather than from whatever the browser's storage claims.
      const { data: user } = await getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/auth/signup');
        return;
      }

      // Read through the auth client — RLS only returns this row to its owner,
      // and the anonymous client would see nothing at all.
      const { data: profile } = await supabaseAuth
        .from('user_profiles')
        .select('user_type, verification_status, linked_healer_slug, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      setState({ status: 'ready', email: user.email, profile: profile || null });
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    // replace, not push: the back button should not return to a page that now
    // bounces straight to sign-in.
    router.replace('/');
  }, [signingOut, router]);

  if (state.status === 'checking') {
    return (
      <main className="min-h-screen bg-[#0a0f1d] text-white">
        <nav className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
            <SiteLogo />
          </div>
        </nav>
        <p className="mx-auto max-w-3xl px-6 py-20 text-center text-sm text-gray-500">
          Checking your session…
        </p>
      </main>
    );
  }

  // A missing profile row is treated as an explorer rather than as an error.
  // The row is created at verification, but someone whose migration failed
  // should still see a working account page, not a broken one.
  const userType = state.profile?.user_type === 'practitioner' ? 'practitioner' : 'explorer';
  const isPractitioner = userType === 'practitioner';
  const status = state.profile?.verification_status;

  // A rejection reverts the account to explorer, so the notice cannot be gated
  // on being a practitioner any more — the one person who most needs to read it
  // is no longer one. Pending and approved stay practitioner-only.
  const notice = status === 'rejected' ? STATUS_NOTICES.rejected : isPractitioner ? STATUS_NOTICES[status] : null;
  const healerSlug = state.profile?.linked_healer_slug;

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <SiteLogo />
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-6 py-14">
        <h1 className="text-3xl font-bold">My Account</h1>

        <dl className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#111827]">
          {state.profile?.full_name && (
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-white">{state.profile.full_name}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-gray-500">Email</dt>
            <dd className="break-all text-right text-sm font-medium text-white">{state.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-gray-500">Account type</dt>
            <dd className="text-sm font-medium text-white">
              {isPractitioner ? 'Practitioner' : 'Explorer'}
            </dd>
          </div>
        </dl>

        {notice && (
          <div className={`mt-6 rounded-2xl border p-5 text-left ${notice.className}`}>
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="mt-1 text-sm leading-relaxed opacity-90">{notice.body}</p>

            {/* The link only appears when there is actually a profile to open.
                An approved practitioner with no linked slug yet would otherwise
                get a link to /healers/undefined. */}
            {notice.footnote && (
              <p className="mt-3 text-sm leading-relaxed opacity-90">{notice.footnote}</p>
            )}

            {notice.action && (
              <Link
                href={notice.action.href}
                className="mt-4 inline-block rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
              >
                {notice.action.label}
              </Link>
            )}

            {status === 'approved' && healerSlug && (
              <Link
                href={`/healers/${healerSlug}`}
                className="mt-3 inline-block text-sm font-semibold underline underline-offset-4 hover:text-white"
              >
                View your profile →
              </Link>
            )}
          </div>
        )}

        {/* No My Library link here. /account is not an /auth route, so the
            floating button is already on this screen, and putting a second one
            in the page repeats the duplication that was stripped out of the
            subject and library navs. */}
        <div className="mt-10">
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="w-full rounded-full px-6 py-3 text-sm font-semibold text-gray-500 transition-colors hover:text-white disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </main>
  );
}
