'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { getUser } from '@/utils/supabaseAuth';

// Shown once a practitioner has submitted their profile for review.
//
// The important work this page does is emotional, not functional: someone has
// just filled in a long form about their life's work and handed it to strangers
// to judge. It names the address the answer will come to, gives a timeframe,
// and makes clear the wait costs them nothing — the rest of Spiritpedia is
// already theirs to use.
export default function PendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data) {
        router.replace('/auth/signup');
        return;
      }
      setEmail(data.email);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AuthShell>
      <h1 className="mt-8 text-2xl font-bold leading-snug">
        Thank you for joining Spiritpedia <span aria-hidden="true">✦</span>
      </h1>

      <p className="mt-4 text-sm leading-relaxed text-gray-400">
        We&apos;re reviewing your practitioner profile. We&apos;ll be in touch at{' '}
        {/* Until the address is known the sentence still reads; it does not
            flash the word "null" or collapse mid-clause. */}
        <span className="font-semibold text-white">{email || 'your email address'}</span> within a
        few days.
      </p>

      <p className="mt-4 text-sm leading-relaxed text-gray-500">
        In the meantime, you can explore the platform and save content to your library.
      </p>

      <Link
        href="/"
        className="mt-8 block w-full rounded-full bg-[#7c3aed] px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#6d28d9] hover:scale-[1.02] active:scale-[0.98]"
      >
        Start Exploring →
      </Link>
    </AuthShell>
  );
}
