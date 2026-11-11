// One heading treatment for every section, so the sidebar label and the page
// title always agree and a new section cannot invent its own styling.
// `aside` sits beside the title itself (the Inbox's refresh button); children
// go to the far end of the row.
export default function SectionHeading({ title, subtitle, aside, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {aside}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
