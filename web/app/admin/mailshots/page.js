'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { MailshotsTab } from '@/components/admin/AdminPlaceholders';

export default function AdminMailshotsPage() {
  return (
    <>
      <SectionHeading title="Mailshots" subtitle="Targeted email to healers and practitioners" />
      <MailshotsTab />
    </>
  );
}
