'use client';

// "↻ Refresh · Updated 14:02:31" — a visible re-read, so a page that has not
// changed can be told apart from a page that has not looked (owner, 11 Nov
// 2026). `updatedAt` is when the data on screen was read (ms), `busy` while a
// read is in flight; the data stays on screen meanwhile.
export function formatUpdated(updatedAt) {
  if (!updatedAt) return 'Not read yet';
  return `Updated ${new Date(updatedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

export default function RefreshButton({ onClick, busy, updatedAt, label = 'Refresh' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={busy ? 'Refreshing' : label}
        title={label}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
      >
        <span aria-hidden="true" className={busy ? 'inline-block animate-spin' : 'inline-block'}>
          ↻
        </span>
        {busy ? 'Refreshing…' : label}
      </button>
      <span className="text-[11px] text-slate-500" data-testid="updated-at">
        {formatUpdated(updatedAt)}
      </span>
    </span>
  );
}
