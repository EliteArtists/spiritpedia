import Link from 'next/link';
import StoreBadges from '@/components/StoreBadges';
import { buildMetadata } from '@/utils/seo';
import { APP_LINE, TRADEMARKS } from '@/utils/appStores';

// About Spiritpedia. The main text is the owner's own words (16 Nov 2026),
// unedited but for the closing full stop: change them only on the owner's
// say-so. Below it, the app line and badges (placement 'about', migration
// 0052), and Apple's and Google's trademark wording in the small print.
const ABOUT =
  'Spiritpedia is a guide to spirituality and personal growth. Instead of searching by topic, you can start from how you feel, and we guide you to teachers, books, videos, practices, schools and retreat centres that speak to where you are. Spiritpedia is free, on the web and on the App Store and Google Play.';

export const metadata = buildMetadata({
  title: 'About',
  description: ABOUT,
  path: '/about',
});

export default function AboutPage() {
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
          <h1 className="mt-8 text-3xl font-bold">About Spiritpedia</h1>
        </div>

        <p className="mt-8 text-base leading-relaxed text-gray-300 md:text-lg">{ABOUT}</p>

        <section className="mt-12 rounded-2xl border border-white/10 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-white">{APP_LINE}.</h2>
          <StoreBadges placement="about" className="mt-6 justify-center" />
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block text-sm font-semibold text-[#a78bfa] transition-colors hover:text-white"
          >
            Back to Spiritpedia
          </Link>
        </div>

        <p className="mt-12 text-center text-xs leading-relaxed text-gray-600">{TRADEMARKS}</p>
      </div>
    </main>
  );
}
