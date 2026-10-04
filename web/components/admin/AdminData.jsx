'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// One fetch of /api/admin/overview for the whole dashboard.
//
// Every section needs some slice of the same payload — the queue counts, the
// profiles behind People and Claims, the totals behind Analytics — and the
// sidebar needs the Inbox badge before any of them render. Fetching per route
// would mean the same request four times and a badge that changes as you
// navigate.
const AdminDataContext = createContext(null);

export function useAdminData() {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error('useAdminData must be used inside AdminDataProvider');
  return value;
}

export function AdminDataProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    // null (not []) means "could not be read" — the sections render a reason
    // rather than an empty list, which would read as "nobody has signed up".
    profiles: null,
    // [] rather than null: an unreadable queue is already signalled by
    // `profiles` being null, and a second null would make every consumer check
    // twice for the same outage.
    pendingReviews: [],
    counts: {},
    error: null,
  });

  const fetchOverview = useCallback(async () => {
    // A DEADLINE, not an open-ended wait.
    //
    // The route reads Supabase, and when Supabase hangs rather than refuses —
    // which is what a platform outage looks like from here — this fetch never
    // settles. Measured: the dashboard sat on "Loading…" for over 30 seconds
    // with no explanation and no way to tell a slow network from a dead one.
    // Fifteen seconds is far longer than a healthy response (under a second)
    // and short enough to be an answer rather than a hang.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/admin/overview', {
        cache: 'no-store',
        signal: controller.signal,
      });
      const json = await res.json();
      return {
        loading: false,
        profiles: json.profiles ?? null,
        pendingReviews: json.pendingReviews || [],
        counts: json.counts || {},
        error: json.error || null,
      };
    } catch (err) {
      return {
        loading: false,
        profiles: null,
        pendingReviews: [],
        counts: {},
        error: err?.name === 'AbortError' ? 'unreachable' : err.message,
      };
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const reload = useCallback(async () => {
    setState(await fetchOverview());
  }, [fetchOverview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchOverview();
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview]);

  const accountsAvailable = Array.isArray(state.profiles);
  const pendingApplications = accountsAvailable
    ? state.profiles.filter(
        (p) => p.user_type === 'practitioner' && p.verification_status === 'pending'
      ).length
    : 0;
  const claims = accountsAvailable ? state.profiles.filter((p) => p.linked_healer_slug).length : 0;

  // WHAT THE BADGE MEANS. It used to count practitioner applications, which was
  // accurate and too narrow: a review sitting unmoderated is a thing waiting on
  // the admin just as much. The number is now everything that needs a decision,
  // which is what a badge on an inbox is read as.
  const pendingReviewCount = state.pendingReviews?.length || 0;
  const pendingActions = pendingApplications + pendingReviewCount;

  return (
    <AdminDataContext.Provider
      value={{
        ...state,
        reload,
        accountsAvailable,
        pendingApplications,
        pendingReviewCount,
        pendingActions,
        claims,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}
