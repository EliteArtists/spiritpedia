'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { MessagesTab } from '@/components/admin/AdminPlaceholders';

export default function AdminMessagesPage() {
  return (
    <>
      <SectionHeading title="Messages" subtitle="Conversations between users and admin" />
      <MessagesTab />
    </>
  );
}
