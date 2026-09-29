import Link from 'next/link';

// The frame every auth page shares: the star, centred, on the site's navy, with
// everything else stripped away. No shelves, no pills, no library button — one
// task on screen and nothing competing with it.
//
// The star links home so the page is never a dead end for someone who arrived
// by accident and would rather just keep browsing.
//
// `my-auto` on the inner column rather than `justify-center` on the flex
// parent: both centre content that fits, but a centred flex child taller than
// the viewport overflows EQUALLY at both ends, putting the top of a long form
// above the scroll origin where it cannot be reached. Auto margins collapse to
// zero instead once the content runs out of room.
export default function AuthShell({ children, maxWidthClass = 'max-w-sm' }) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0a0f1d] px-6 py-16 text-white">
      <div className={`my-auto w-full ${maxWidthClass} text-center`}>
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
