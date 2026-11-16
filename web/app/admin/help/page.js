import fs from 'node:fs';
import path from 'node:path';
import SectionHeading from '@/components/admin/SectionHeading';
import GuideMarkdown, { guideSections } from '@/components/admin/GuideMarkdown';

// Admin → Help: the admin guide, web/docs/admin-guide.md.
//
// WHY THE FILE LIVES IN web/. Vercel builds from the Root Directory, web/
// (README §4), and the ignored-build step only redeploys when something
// under web/ changes. A guide kept in the repo's top-level docs/ might not be
// there at build time, and an edit to it would never reach this page.
// docs/admin-guide.md is a symlink to this file, so both paths are the one
// document.
//
// Read at build time: force-static prerenders the page, so the markdown is
// baked into the build and nothing reads the disk in production. (In
// development it is read on every request, so edits show on refresh.) The
// page is still behind the admin login: proxy.js runs before any page,
// static or not, for /admin/:path*.
export const dynamic = 'force-static';

function readGuide() {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'docs', 'admin-guide.md'), 'utf8');
  } catch {
    return null;
  }
}

export default function AdminHelpPage() {
  const markdown = readGuide();

  if (!markdown) {
    return (
      <>
        <SectionHeading title="Help" subtitle="The admin guide" />
        <p className="text-sm text-slate-400">
          The guide could not be read. It lives in <code className="font-mono">web/docs/admin-guide.md</code>.
        </p>
      </>
    );
  }

  const sections = guideSections(markdown);

  return (
    <>
      <SectionHeading title="Help" subtitle="The admin guide: what each screen is for, and how often to look" />

      {sections.length > 0 && (
        <nav aria-label="On this page" className="mb-2 rounded-2xl border border-white/10 bg-[#111827] p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">On this page</p>
          <ul className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <GuideMarkdown markdown={markdown} skipTitle />
    </>
  );
}
