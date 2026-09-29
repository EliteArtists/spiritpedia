'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Placeholder } from './AdminPlaceholders.jsx';

const TIERS = [
  { value: 'local_hero', label: 'Local Hero' },
  { value: 'luminary', label: 'Luminary' },
  { value: 'superhero', label: 'Superhero' },
  { value: 'ascended_master', label: 'Ascended Master' },
];

const ENTITY_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'channel', label: 'Channel' },
  { value: 'app', label: 'App' },
];

const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'border-slate-700 bg-slate-800 text-slate-400';
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {status || 'unknown'}
    </span>
  );
}

function TypeBadge({ userType }) {
  const practitioner = userType === 'practitioner';
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        practitioner
          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
          : 'border-slate-700 bg-slate-800 text-slate-400'
      }`}
    >
      {practitioner ? 'Practitioner' : 'Explorer'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Shown wherever account data would be, when the service role key is absent.
// It replaces the list rather than sitting beside it — an empty list under a
// warning still reads as "there is nothing here", which is a different claim.
export function NotConfigured({ what }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
      <p className="text-sm font-bold text-amber-300">{what} cannot be read</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-amber-200/70">
        Row-level security grants each signed-in user their own profile row and nothing else, which
        is what stops one member reading another&apos;s account. The dashboard therefore reads this
        data on the server with the service role key, and{' '}
        <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> is not set.
      </p>
      <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-amber-200/50">
        Add it to web/.env.local and to Vercel. It must never carry a NEXT_PUBLIC_ prefix — that
        would publish a key that bypasses every access rule on the database.
      </p>
    </div>
  );
}

/* ── TAB 1 — PRACTITIONERS ─────────────────────────────────────────────── */

function PractitionerCard({ profile, onDecision, busy }) {
  const [tier, setTier] = useState('local_hero');
  const [entityType, setEntityType] = useState('individual');
  const [message, setMessage] = useState(null);

  const place = [profile.location_city, profile.location_country].filter(Boolean).join(', ');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-left">
          <p className="text-lg font-bold text-white">{profile.full_name || 'Unnamed'}</p>
          <p className="mt-0.5 text-sm text-cyan-300">{profile.modality || 'No modality given'}</p>
          <p className="mt-1 text-xs text-slate-500">{place || 'No location given'}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{profile.email || 'No email found'}</p>
        </div>
        <StatusBadge status={profile.verification_status} />
      </div>

      {profile.bio && (
        <p className="mt-4 max-h-32 overflow-y-auto whitespace-pre-line text-left text-sm leading-relaxed text-slate-400">
          {profile.bio}
        </p>
      )}

      {profile.website_url && (
        <a
          href={profile.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block break-all text-left text-xs text-cyan-400 hover:text-cyan-300"
        >
          {profile.website_url}
        </a>
      )}

      {Array.isArray(profile.image_urls) && profile.image_urls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.image_urls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-lg border border-slate-800 object-cover"
            />
          ))}
        </div>
      )}

      {Array.isArray(profile.subject_slugs) && profile.subject_slugs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {profile.subject_slugs.map((slug) => (
            <span
              key={slug}
              className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400"
            >
              {slug}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          Entity type
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
          >
            {ENTITY_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
          >
            {TIERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(profile.id, 'approve', { tier, entityType })}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(profile.id, 'reject')}
          className="rounded-full border border-red-500/50 px-5 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => setMessage('Messaging coming soon')}
          className="rounded-full border border-slate-700 px-5 py-2 text-sm font-bold text-slate-500 transition-colors hover:text-white"
        >
          Message
        </button>
        {message && <span className="self-center text-xs text-slate-500">{message}</span>}
      </div>
    </div>
  );
}

export function PractitionersTab({ profiles, onDecision, busyId }) {
  if (profiles === null) return <NotConfigured what="Practitioner applications" />;

  const pending = profiles.filter(
    (p) => p.verification_status === 'pending' && p.user_type === 'practitioner'
  );

  if (pending.length === 0) {
    return <Placeholder icon="✓" title="No practitioners awaiting review" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {pending.map((profile) => (
        <PractitionerCard
          key={profile.id}
          profile={profile}
          onDecision={onDecision}
          busy={busyId === profile.id}
        />
      ))}
    </div>
  );
}

/* ── TAB 2 — ACCOUNTS ──────────────────────────────────────────────────── */

export function AccountsTab({ profiles }) {
  if (profiles === null) return <NotConfigured what="Accounts" />;
  if (profiles.length === 0) return <Placeholder icon="○" title="No accounts yet" />;

  return (
    <div className="flex flex-col gap-3">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <div className="text-left">
            <p className="break-all text-sm font-semibold text-white">
              {profile.email || profile.full_name || profile.id}
            </p>
            <p className="mt-1 text-xs text-slate-500">Joined {formatDate(profile.created_at)}</p>
            {profile.linked_healer_slug && (
              <Link
                href={`/healers/${profile.linked_healer_slug}`}
                className="mt-1 inline-block text-xs text-cyan-400 hover:text-cyan-300"
              >
                /healers/{profile.linked_healer_slug} →
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TypeBadge userType={profile.user_type} />
            <StatusBadge status={profile.verification_status} />
            <button
              type="button"
              title="Coming soon"
              className="cursor-not-allowed rounded-full border border-slate-800 px-4 py-1.5 text-xs font-bold text-slate-600"
            >
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── TAB 4 — CLAIMS ───────────────────────────────────────────────────── */

export function ClaimsTab({ profiles }) {
  const claimed = profiles === null ? null : profiles.filter((p) => p.linked_healer_slug);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="mb-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
          Claimed profiles
        </h3>
        {claimed === null ? (
          <NotConfigured what="Claims" />
        ) : claimed.length === 0 ? (
          <Placeholder icon="○" title="No profiles claimed yet" />
        ) : (
          <div className="flex flex-col gap-3">
            {claimed.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="text-left">
                  <p className="break-all text-sm font-semibold text-white">
                    {profile.email || profile.id}
                  </p>
                  <Link
                    href={`/healers/${profile.linked_healer_slug}`}
                    className="mt-1 inline-block text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {profile.linked_healer_slug} →
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={profile.verification_status} />
                  <Link
                    href={`/healers/${profile.linked_healer_slug}`}
                    className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    View Profile
                  </Link>
                  <button
                    type="button"
                    title="Coming soon"
                    className="cursor-not-allowed rounded-full border border-slate-800 px-4 py-1.5 text-xs font-bold text-slate-600"
                  >
                    Revoke Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
          Publisher claim requests
        </h3>
        <Placeholder
          icon="🏢"
          title="No publisher claims yet"
          body="When publishers click Claim Your Account, requests will appear here."
        />
      </section>
    </div>
  );
}

/* ── TAB 7 — STATS ────────────────────────────────────────────────────── */

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-slate-800 bg-slate-900 text-white',
    alert: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    quiet: 'border-slate-800 bg-slate-900 text-slate-600',
  };
  return (
    <div className={`rounded-2xl border p-6 text-left ${tones[tone]}`}>
      <p className="text-3xl font-black tabular-nums">{value ?? '—'}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

export function StatsTab({ counts, accountsAvailable }) {
  const c = counts || {};
  return (
    <div className="flex flex-col gap-10 text-left">
      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Platform totals
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Healers" value={c.healers} />
          <StatCard label="Videos" value={c.videos} />
          <StatCard label="Books" value={c.books} />
          <StatCard label="Courses & offerings" value={c.courses} />
          <StatCard label="Free resources" value={c.free_resources} />
          <StatCard label="Publishers" value={c.publishers} />
          <StatCard
            label="Registered users"
            value={accountsAvailable ? c.users : 'n/a'}
            tone={accountsAvailable ? 'default' : 'quiet'}
          />
          <StatCard
            label="Practitioners"
            value={accountsAvailable ? c.practitioners : 'n/a'}
            tone={accountsAvailable ? 'default' : 'quiet'}
          />
          <StatCard
            label="Explorers"
            value={accountsAvailable ? c.explorers : 'n/a'}
            tone={accountsAvailable ? 'default' : 'quiet'}
          />
        </div>
        {!accountsAvailable && (
          <p className="mt-3 text-xs text-slate-600">
            User figures need the service role key — see the Practitioners tab.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Pending items
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Practitioners awaiting review"
            value={accountsAvailable ? c.pending_practitioners : 'n/a'}
            tone={accountsAvailable && c.pending_practitioners > 0 ? 'alert' : 'quiet'}
          />
          <StatCard
            label="Claim requests"
            value={accountsAvailable ? c.claims : 'n/a'}
            tone={accountsAvailable && c.claims > 0 ? 'alert' : 'quiet'}
          />
          {/* Flags have no table yet, so this is a literal zero rather than a
              count of nothing — labelled quiet so it does not read as live. */}
          <StatCard label="Content flags" value={0} tone="quiet" />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          New this week
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Healers added" value={c.healers_this_week} />
          <StatCard label="Books added" value={c.books_this_week} />
          <StatCard
            label="Users signed up"
            value={accountsAvailable ? c.users_this_week : 'n/a'}
            tone={accountsAvailable ? 'default' : 'quiet'}
          />
        </div>
      </section>
    </div>
  );
}
