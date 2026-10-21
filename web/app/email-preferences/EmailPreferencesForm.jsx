'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import EmailPreferencesSwitch from '@/components/EmailPreferencesSwitch';
import { isToken } from '@/utils/unsubscribe';

export default function EmailPreferencesForm() {
  const token = useSearchParams().get('token') || '';
  return (
    <AuthShell maxWidthClass="max-w-md">
      <h1 className="mt-8 text-2xl font-bold leading-snug">What you receive</h1>
      <div className="mt-8">
        {isToken(token) ? (
          <EmailPreferencesSwitch emailToken={token} />
        ) : (
          <p role="alert" className="text-sm leading-relaxed text-red-400">
            This link is incomplete. Email love@spiritpedia.co and we&rsquo;ll change it for you.
          </p>
        )}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-gray-500 underline underline-offset-4 hover:text-white">
        Back to Spiritpedia
      </Link>
    </AuthShell>
  );
}
