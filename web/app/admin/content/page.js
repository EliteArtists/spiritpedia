'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';

// Browsing and moderating published content. Distinct from Ingestion, which
// adds it. Nothing to show until content submissions exist — a later phase.
export default function AdminContentPage() {
  return (
    <>
      <SectionHeading title="Content" subtitle="Browse and moderate published content" />
      <Placeholder
        icon="▦"
        title="Content library — coming soon"
        body="Browse, edit and moderate everything published on Spiritpedia. Add new content from the Ingestion section."
      />
    </>
  );
}
