import Link from 'next/link';

// The masthead logo: gold star mark + wordmark, as one link home.
//
// Shared deliberately. It used to be copy-pasted into the homepage, subject
// and library navs, so the brand refresh landed on the homepage and left the
// other two showing the retired gradient "SPIRITPEDIA" — which is what a
// visitor saw the moment they clicked a search result.
//
// The star is decorative: the wordmark beside it already carries the name, so
// announcing both would have a screen reader say "Spiritpedia" twice.
export default function SiteLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <img
        src="/Spiritpedia_Header_Symbol.png"
        alt=""
        aria-hidden="true"
        className="h-10 w-10 object-contain"
      />
      <span className="text-base font-bold tracking-wider text-white">Spiritpedia</span>
    </Link>
  );
}
