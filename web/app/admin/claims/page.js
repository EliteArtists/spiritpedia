'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeading from '@/components/admin/SectionHeading';
import RefreshButton from '@/components/admin/RefreshButton';
import { Placeholder } from '@/components/admin/AdminPlaceholders';
import { typeLabel } from '@/utils/badges';

// Admin → Claims, for every kind of listing and for publishers (owner, 11 Nov
// 2026). Pending requests are decided in the Inbox; this page is the record:
// who manages what, every request and what became of it, and Revoke.

const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
  withdrawn: 'border-slate-700 bg-slate-800 text-slate-400',
};

const KIND_FILTERS = [
  { key: 'all', label: 'Every kind' },
  { key: 'individual', label: 'Practitioners' },
  { key: 'channel', label: 'Channels' },
  { key: 'app', label: 'Apps' },
  { key: 'organisation', label: 'Organisations' },
  { key: 'school', label: 'Schools' },
  { key: 'publisher', label: 'Publishers' },
];

const PROOF_WORDS = { listing_email: 'listing’s email', code: 'code', other: 'other proof' };

function Badge({ className, children }) {
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

function day(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

// What a managed row or a request is about, as one shape.
function managedTarget(row) {
  if (row.publisher || row.linked_publisher_id) {
    return {
      kind: 'publisher',
      label: 'Publisher',
      name: row.publisher?.name || 'Unknown publisher',
      href: row.publisher?.slug ? `/publishers/${row.publisher.slug}` : null,
      target: 'publisher',
    };
  }
  const kind = row.listing?.entity_type || 'individual';
  return {
    kind,
    label: typeLabel(kind) || 'Practitioner',
    name: row.listing?.name || row.linked_healer_slug,
    href: `/healers/${row.linked_healer_slug}`,
    official: Boolean(row.listing?.official),
    target: 'listing',
  };
}

function requestTarget(r) {
  if (r.publisher_id) {
    return { kind: 'publisher', label: 'Publisher', name: r.publishers?.name || 'Unknown publisher', href: r.publishers?.slug ? `/publishers/${r.publishers.slug}` : null };
  }
  const kind = r.healers?.entity_type || 'individual';
  return { kind, label: typeLabel(kind) || 'Practitioner', name: r.healers?.name || r.healer_slug, href: `/healers/${r.healer_slug}` };
}

export default function AdminClaimsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('all');
  const [confirming, setConfirming] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/claims', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || json.error || 'Could not read claims.');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = useCallback(
    async (row, target) => {
      setToast(null);
      const res = await fetch('/api/admin/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', user_id: row.id, target }),
      });
      const json = await res.json().catch(() => ({}));
      setConfirming(null);
      if (!res.ok || json.error) {
        setToast({ type: 'error', message: json.message || json.error || 'That did not work.' });
        return;
      }
      setToast({ type: 'success', message: 'Claim revoked. The listing is no longer theirs to manage; tell them yourself.' });
      load();
    },
    [load]
  );

  const managed = useMemo(
    () => (data?.managed || []).map((row) => ({ row, t: managedTarget(row) })).filter(({ t }) => kind === 'all' || t.kind === kind),
    [data, kind]
  );
  const requests = useMemo(
    () => (data?.requests || []).map((r) => ({ r, t: requestTarget(r) })).filter(({ t }) => kind === 'all' || t.kind === kind),
    [data, kind]
  );
  const pending = requests.filter(({ r }) => r.status === 'pending').length;

  return (
    <>
      <SectionHeading
        title="Claims"
        subtitle="Who manages which listing or publisher, and every request to"
        aside={<RefreshButton onClick={load} busy={busy} updatedAt={data?.readAt ? Date.parse(data.readAt) : null} />}
      />

      {toast && (
        <div
          className={`mb-5 rounded-xl border p-4 text-sm ${
            toast.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Filter by kind"
          className="rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white"
        >
          {KIND_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        {pending > 0 && (
          <Link href="/admin?filter=claim" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
            {pending} waiting for a decision in the Inbox →
          </Link>
        )}
      </div>

      {error ? (
        <Placeholder icon="⚠" title="Claims unavailable" body={error} />
      ) : !data ? (
        <Placeholder icon="◴" title="Loading…" />
      ) : (
        <div className="flex flex-col gap-10">
          <section>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Managed by their owner ({managed.length})
            </h3>
            {managed.length === 0 ? (
              <Placeholder icon="○" title="None of this kind" />
            ) : (
              <ul className="flex flex-col gap-3">
                {managed.map(({ row, t }) => {
                  const key = `${row.id}:${t.target}`;
                  return (
                    <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-white">
                          {t.href ? (
                            <Link href={t.href} target="_blank" className="hover:text-[#a78bfa]">
                              {t.name}
                            </Link>
                          ) : (
                            t.name
                          )}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">
                          {row.email || row.full_name || row.id} · account since {day(row.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="border-slate-600 bg-slate-800 text-slate-300">{t.label}</Badge>
                        {t.official && <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-300">Official</Badge>}
                        {confirming === key ? (
                          <>
                            <span className="text-xs text-slate-400">Unlink this account?</span>
                            <button
                              type="button"
                              onClick={() => revoke(row, t.target)}
                              className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-400"
                            >
                              Yes, revoke
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={t.official}
                            title={t.official ? 'Spiritpedia’s own listing' : 'Unlink this account from what it manages'}
                            onClick={() => setConfirming(key)}
                            className="rounded-full border border-red-500/50 px-4 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Revoke Claim
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Claim requests ({requests.length})
            </h3>
            {requests.length === 0 ? (
              <Placeholder icon="○" title="No claim requests of this kind" body="Listing and publisher requests both appear here." />
            ) : (
              <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                {requests.map(({ r, t }) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-white">
                        {t.href ? (
                          <Link href={t.href} target="_blank" className="hover:text-[#a78bfa]">
                            {t.name}
                          </Link>
                        ) : (
                          t.name
                        )}
                      </p>
                      <p className="mt-0.5 break-all text-xs text-slate-500">
                        {r.requester_email || r.user_id} · asked {day(r.created_at)}
                        {r.decided_at ? ` · decided ${day(r.decided_at)}` : ''}
                        {r.proof ? ` · confirmed by ${PROOF_WORDS[r.proof] || r.proof}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="border-slate-600 bg-slate-800 text-slate-300">{t.label}</Badge>
                      <Badge className={STATUS_STYLES[r.status] || STATUS_STYLES.withdrawn}>{r.status}</Badge>
                      {r.status === 'pending' && (
                        <Link href="/admin?filter=claim" className="text-xs font-bold text-[#a78bfa] hover:text-white">
                          Decide →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
