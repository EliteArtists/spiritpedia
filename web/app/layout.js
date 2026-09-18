import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
} from "@/utils/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Site-wide defaults. Every route inherits these; a route's generateMetadata
// overrides the fields it sets and leaves the rest. `metadataBase` is what lets
// Next resolve relative URLs (the file-based opengraph-image, canonical paths)
// to absolute ones — crawlers reject relative og:image / og:url.
//
// The title template applies to pages that supply their own title
// ("Louise Hay | Spiritpedia"); the homepage keeps the full default string.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  // The golden star symbol is the favicon at every size and the site-wide
  // share image. There is no app/opengraph-image.js any more — a file-based
  // image would override these `images` entries, so the symbol is declared
  // here and reused by buildMetadata() for any entity without its own image.
  icons: {
    icon: "/Transparent_Symbol.png",
    apple: "/Transparent_Symbol.png",
    shortcut: "/Transparent_Symbol.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_GB",
    images: [{ ...DEFAULT_OG_IMAGE, alt: DEFAULT_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ ...DEFAULT_TWITTER_IMAGE, alt: DEFAULT_TITLE }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
