'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';

export default function AdminSettingsPage() {
  return (
    <>
      <SectionHeading title="Settings" subtitle="Dashboard and platform configuration" />
      <Placeholder icon="⚙" title="Settings — coming soon" />
    </>
  );
}
