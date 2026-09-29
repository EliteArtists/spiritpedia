'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/SiteLogo';
import { getUser } from '@/utils/supabaseAuth';

// Placeholder for the account area. It exists so the account icon has somewhere
// to send a signed-in visitor; the real thing arrives in a later step.
//
// It guards itself even as a stub. getUser() rather than getSession(), because
// this one decides whether to show someone a page that is theirs, and getSession
// only reports what the browser's own storage claims. A stub that greeted
// anyone who typed the URL would be an honest-looking lie about the state of
// the build.
export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'checking', email: null });

  useEffect(() => {
    let cancelled = false;
    getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data) {
        router.replace('/auth/signup');
        return;
      }
      setState({ status: 'ready', email: data.email });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0a0f1d] text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <SiteLogo />
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        {state.status === 'checking' ? (
          <p className="text-sm text-gray-500">Checking your session…</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Your account</h1>
            <p className="mt-3 text-sm text-gray-400">Signed in as {state.email}</p>
            <p className="mt-8 text-sm text-gray-500">
              This area is still being built.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
