'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import PushComposer from '@/components/admin/PushComposer';

export default function AdminNotificationsPage() {
  return (
    <>
      <SectionHeading title="Notifications" subtitle="Push messages to the app, and what the package has sent" />
      <PushComposer />
    </>
  );
}
