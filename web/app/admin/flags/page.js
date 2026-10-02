'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { FlagsTab } from '@/components/admin/AdminPlaceholders';

export default function AdminFlagsPage() {
  return (
    <>
      <SectionHeading title="Flags" subtitle="Content reported by users" />
      <FlagsTab />
    </>
  );
}
