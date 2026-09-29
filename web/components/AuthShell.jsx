import Link from 'next/link';

// The frame both auth pages share: the star, centred, on the site's navy, with
// everything else stripped away. No shelves, no pills, no library button — one
// task on screen and nothing competing with it.
//
// The star links home so the page is never a dead end for someone who arrived
// by accident and would rather just keep browsing.
export default function AuthShell({ children }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className="w-full max-w-sm text-center">
        <Link href="/" aria-label="Spiritpedia home" className="inline-block">
          <img
            src="/Spiritpedia_Header_Symbol.png"
            alt=""
            aria-hidden="true"
            className="mx-auto h-14 w-14 object-contain transition-transform duration-200 hover:scale-105"
          />
        </Link>
        {children}
      </div>
    </main>
  );
}
