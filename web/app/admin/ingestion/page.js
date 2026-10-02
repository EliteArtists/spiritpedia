'use client';

import ContentIngestion from '@/components/admin/ContentIngestion';

// The ingestion form, unchanged, now reached from the sidebar rather than a
// button that scrolled the page. ContentIngestion carries its own heading.
export default function AdminIngestionPage() {
  return <ContentIngestion />;
}
