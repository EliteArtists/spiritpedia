'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClosedAccountBanner from '@/components/admin/ClosedAccountBanner';
import ContentIngestion from '@/components/admin/ContentIngestion';

// The ingestion form, reached from the sidebar. ContentIngestion carries its
// own heading.
//
// ?publisher={id}&closed={account_deletions.id}: opened from the Inbox because
// a publisher's owner deleted their account (migration 0022). It opens on the
// Publisher tab with that publisher ready to edit, under the banner that marks
// the item reviewed.
function Ingestion() {
  const params = useSearchParams();
  const publisherId = params.get('publisher');
  const closedId = params.get('closed');
  return (
    <>
      {closedId && (
        <div className="mx-auto max-w-4xl px-6 pt-6">
          <ClosedAccountBanner closedId={closedId} kind="publisher" />
        </div>
      )}
      <ContentIngestion initialPublisherId={publisherId} />
    </>
  );
}

export default function AdminIngestionPage() {
  return (
    <Suspense fallback={null}>
      <Ingestion />
    </Suspense>
  );
}
