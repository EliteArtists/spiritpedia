import Link from 'next/link';

// Shared shell for the long-form legal pages (/terms, /privacy), in the same
// style as /affiliate-disclosure: dark page, star mark, centred title, a
// left-aligned reading column. Server component — these pages are static.
//
// The working copy of the wording lives in legal-draft.md at the repo root,
// which is deliberately NOT committed. Edit the page and that file together.

export function LegalPage({ title, updated, intro, children }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <Link href="/" aria-label="Spiritpedia home" className="inline-block">
            <img
              src="/Spiritpedia_Header_Symbol.png"
              alt=""
              aria-hidden="true"
              className="mx-auto h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
            />
          </Link>

          <h1 className="mt-8 text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-sm text-gray-500">Last updated: {updated}</p>
        </div>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-300 md:text-base">
          {intro}
          {children}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block text-sm font-semibold text-[#a78bfa] transition-colors hover:text-white"
          >
            Back to Spiritpedia
          </Link>
        </div>
      </div>
    </main>
  );
}

export function Section({ title, children }) {
  return (
    <section className="space-y-4 pt-6">
      <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function Sub({ children }) {
  return <h3 className="pt-1 font-semibold text-white">{children}</h3>;
}

export function List({ children }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-gray-500">{children}</ul>;
}

// A two- or three-column table that collapses to stacked cards on a phone,
// where a real <table> would force a sideways scroll.
export function Rows({ head, rows }) {
  return (
    <div className="divide-y divide-white/10 rounded-xl border border-white/10">
      <div className="hidden gap-4 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 md:grid md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ '--cols': head.length }}>
        {head.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-1 px-4 py-3 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))] md:gap-4"
          style={{ '--cols': head.length }}
        >
          {row.map((cell, j) => (
            <div key={j} className={j === 0 ? 'font-medium text-white' : ''}>
              {j > 0 && (
                <span className="mr-1 text-xs font-bold uppercase tracking-wider text-gray-500 md:hidden">
                  {head[j]}:
                </span>
              )}
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function A({ href, children }) {
  const cls = 'text-[#a78bfa] underline-offset-2 hover:underline';
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
    >
      {children}
    </a>
  );
}

export const CONTACT = 'love@spiritpedia.co';
export const ENTITY = 'Ross Aiken, trading as Spiritpedia';
export const ADDRESS = '124 City Road, London, EC1V 2NX';
export const LAST_UPDATED = '9 October 2026';

export function Mail() {
  return <A href={`mailto:${CONTACT}`}>{CONTACT}</A>;
}
