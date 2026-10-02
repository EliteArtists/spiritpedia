'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { useAdminData } from '@/components/admin/AdminData';
import { StatsTab } from '@/components/admin/AdminLiveTabs';
import { Placeholder } from '@/components/admin/AdminPlaceholders';

export default function AdminAnalyticsPage() {
  const { counts, loading, accountsAvailable } = useAdminData();
  return (
    <>
      <SectionHeading title="Analytics" subtitle="Live counts from the database" />
      {loading ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <StatsTab counts={counts} accountsAvailable={accountsAvailable} />
      )}
    </>
  );
}
