'use client';

// Why the account data is missing. There is more than one reason and they need
// different answers, so the dashboard says which rather than showing one
// catch-all — or worse, an empty list that reads as "nobody has signed up".
export default function DataProblem({ error, what = 'This data' }) {
  if (error === 'service_role_missing') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <p className="text-sm font-bold text-amber-300">{what} cannot be read</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-amber-200/70">
          Row-level security grants each signed-in user their own profile row and nothing else,
          which is what stops one member reading another&apos;s account. The dashboard reads this on
          the server with the service role key, and{' '}
          <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> is not set.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-amber-200/50">
          Add it to web/.env.local and to Vercel. It must never carry a NEXT_PUBLIC_ prefix.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
      <p className="text-sm font-bold text-red-300">Could not reach the database</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-red-200/70">
        {error === 'unreachable'
          ? 'Supabase did not respond within 15 seconds. This is usually a platform outage rather than anything on this machine — check status.supabase.com.'
          : error || 'The request failed.'}
      </p>
      <p className="mx-auto mt-3 max-w-lg text-xs text-red-200/50">
        Everything else on this page still works; only live data is missing.
      </p>
    </div>
  );
}
