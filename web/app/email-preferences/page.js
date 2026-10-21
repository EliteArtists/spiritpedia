import { Suspense } from 'react';
import AuthShell from '@/components/AuthShell';
import EmailPreferencesForm from './EmailPreferencesForm';

// "Change what I receive", from a discovery email. Not for search engines.
export const metadata = {
  title: 'Email preferences | Spiritpedia',
  robots: { index: false, follow: false },
};

export default function EmailPreferencesPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="mt-8 text-sm text-gray-500">Loading…</p>
        </AuthShell>
      }
    >
      <EmailPreferencesForm />
    </Suspense>
  );
}
