'use client';

import { useEffect, useState } from 'react';

// Admin → Activity: taps on the website's App Store and Google Play links
// (migration 0052), for the page's range. All website, so the platform toggle
// doesn't apply. Taps, not installs: App Store Connect and Play Console say
// what was installed. Before 0052 runs it says so instead of showing nothing.
const PLACEMENT_WORDS = {
  footer: 'Footer',
  about: 'About page',
  after_signup: 'Welcome card after sign-up',
  welcome_email: 'Welcome email',
  teacher_page: 'Teacher pages',
  library: 'My Library',
  android_banner: 'Android strip',
  get_app_page: '/get-app',
};
const DEVICE_WORDS = { iphone: 'iPhone', ipad: 'iPad', android: 'Android', desktop: 'Computer', other: 'Other' };

export default function AppStoreClicksPanel({ days = 30 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/app-store-clicks?days=${days}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setError(json.error ? json.message || json.error : null);
        if (!json.error) setData(json);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <h2 className="text-sm font-bold text-white">Get the app</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Taps on the website’s App Store and Google Play links, by where they were. Taps, not installs. Website
        only (the platform toggle doesn’t apply).
      </p>
      <div className="mt-4">
        {error ? (
          <p className="text-sm text-amber-300">{error}</p>
        ) : !data ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : data.missing ? (
          <p className="text-sm text-slate-500">Not counting yet: migration 0052 hasn’t been run on this database.</p>
        ) : (
          <>
            <p className="mb-3 text-2xl font-bold text-white">{data.total}</p>
            {data.rows.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="pb-2 font-semibold">Where</th>
                    <th className="pb-2 text-right font-semibold">App Store</th>
                    <th className="pb-2 text-right font-semibold">Google Play</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.placement} className="border-t border-white/5">
                      <td className="py-1.5 text-white">
                        {PLACEMENT_WORDS[r.placement] || r.placement}
                        {r.placement === 'welcome_email' && (
                          <span className="ml-2 text-xs text-slate-500">may include mail link-checkers</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right font-mono text-xs text-slate-300">{r.app_store}</td>
                      <td className="py-1.5 text-right font-mono text-xs text-slate-300">{r.google_play}</td>
                      <td className="py-1.5 text-right font-mono text-xs text-white">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">No taps in this period.</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Android strip closed: {data.dismissed.android_banner} · Welcome card closed: {data.dismissed.after_signup}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {Object.entries(DEVICE_WORDS)
                .map(([k, label]) => `${label} ${data.devices[k] || 0}`)
                .join(' · ')}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Taps on Apple’s own banner in Safari can’t be counted here: App Store Connect → App Analytics → Sources →
              Web Referrer shows them.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
