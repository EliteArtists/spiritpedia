'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import { PRODUCT_LABELS } from '@/utils/contentSubmissions';
import { kindLabel } from '@/components/ContentForm';

// Content from owners (migration 0024): what's waiting, and what they removed
// from their own listings. Removing needs no approval; this is the record.

function what(contentType, productType) {
  return contentType === 'course' ? PRODUCT_LABELS[productType] || 'Course' : kindLabel(contentType);
}

export default function OwnerContentPage() {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/submissions', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setProblem(json.message || json.error);
        else setData(json);
      })
      .catch((err) => !cancelled && setProblem(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (problem) return <Placeholder icon="⚠️" title="Couldn’t load this" body={problem} />;
  if (!data) return <Placeholder icon="◴" title="Loading…" />;

  return (
    <>
      <SectionHeading title="From owners" subtitle="Content owners added or changed, and what they removed" />

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Waiting · {data.pending.length}</h3>
      {data.pending.length === 0 ? (
        <p className="mb-10 text-sm text-slate-500">Nothing waiting.</p>
      ) : (
        <ul className="mb-10 divide-y divide-white/5 rounded-2xl border border-white/10">
          {data.pending.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/submissions/${row.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/5">
                <span className="flex-1 text-sm text-white">
                  {row.kind === 'edit' ? 'Edit: ' : 'New: '}
                  {row.fields?.title || 'Untitled'}
                  <span className="ml-2 text-xs text-slate-500">
                    {what(row.content_type, row.fields?.product_type)} · {row.healers?.name || row.publishers?.name}
                  </span>
                </span>
                <span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('en-GB')}</span>
                <span className="text-xs font-bold text-[#a78bfa]">Review →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Removed by their owners</h3>
      {data.removals.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing removed yet.</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
          {data.removals.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="flex-1 text-slate-300">
                {r.removed_by_name || 'An owner'} removed “{r.title || 'Untitled'}”
                <span className="ml-2 text-xs text-slate-500">
                  {what(r.content_type)}
                  {r.healer_slug ? ` · /healers/${r.healer_slug}` : ''}
                  {r.reviews_deleted ? ` · ${r.reviews_deleted} review${r.reviews_deleted === 1 ? '' : 's'} deleted` : ''}
                  {r.saves_deleted ? ` · ${r.saves_deleted} save${r.saves_deleted === 1 ? '' : 's'} deleted` : ''}
                </span>
              </span>
              <span className="text-xs text-slate-500">{new Date(r.removed_at).toLocaleDateString('en-GB')}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
