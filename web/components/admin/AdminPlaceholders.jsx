'use client';

// Placeholder tabs.
//
// Kept visually distinct from the working ones on purpose: dashed borders,
// muted text, disabled controls. A placeholder that looks like a feature is
// worse than no tab at all — it invites you to wait for a response that is
// never coming.
export function Placeholder({ icon, title, body, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
      <span aria-hidden="true" className="block text-4xl opacity-40">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-400">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{body}</p>}
      {children}
    </div>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="ml-2 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
      Soon
    </span>
  );
}

export function MessagesTab() {
  return (
    <Placeholder
      icon="✉"
      title="Messaging inbox — coming soon"
      body="Once users can message admin, their conversations will appear here."
    />
  );
}

export function FlagsTab() {
  return (
    <Placeholder
      icon="⚑"
      title="Content flags — coming soon"
      body="When users report broken links or incorrect content, flags will appear here."
    />
  );
}

const disabledField =
  'w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-600';

export function MailshotsTab() {
  return (
    <Placeholder
      icon="✦"
      title="Mailshot composer — coming soon"
      body="Send targeted emails to healers and practitioners. £15 per mailshot."
    >
      {/* Real field shapes, all disabled and title-tooltipped, so the tab shows
          what is coming without ever accepting input. */}
      <fieldset
        disabled
        title="Coming soon"
        className="mx-auto mt-8 flex max-w-md flex-col gap-3 text-left opacity-60"
      >
        <select className={disabledField} title="Coming soon">
          <option>Select recipient group</option>
        </select>
        <input className={disabledField} placeholder="Subject" title="Coming soon" />
        <textarea rows={4} className={`${disabledField} resize-none`} placeholder="Message" title="Coming soon" />
        <button
          type="button"
          title="Coming soon"
          className="cursor-not-allowed rounded-full bg-slate-800 px-6 py-3 text-sm font-bold text-slate-600"
        >
          Schedule
        </button>
      </fieldset>
    </Placeholder>
  );
}
