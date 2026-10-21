import { Suspense } from 'react';
import AuthShell from '@/components/AuthShell';
import UnsubscribeForm from './UnsubscribeForm';

// Where the unsubscribe link in a Day 4 or discovery email lands. Not for
// search engines: there is nothing here for anyone without a link.
export const metadata = {
  title: 'Unsubscribe | Spiritpedia',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="mt-8 text-sm text-gray-500">Loading…</p>
        </AuthShell>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}
