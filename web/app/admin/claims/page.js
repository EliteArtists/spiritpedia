'use client';

import SectionHeading from '@/components/admin/SectionHeading';
import { useAdminData } from '@/components/admin/AdminData';
import { ClaimsTab } from '@/components/admin/AdminLiveTabs';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import DataProblem from '@/components/admin/DataProblem';

export default function AdminClaimsPage() {
  const { profiles, loading, error, accountsAvailable } = useAdminData();
  return (
    <>
      <SectionHeading title="Claims" subtitle="Profiles claimed by their owners" />
      {loading ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : !accountsAvailable ? (
        <DataProblem error={error} what="Claims" />
      ) : (
        <ClaimsTab profiles={profiles} />
      )}
    </>
  );
}
