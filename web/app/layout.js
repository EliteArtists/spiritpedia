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
  // Tab icon: the star on the brand's navy ground, a 512px square, so it
  // reads as a solid mark in light and dark tab strips alike. (The
  // transparent starburst collapsed to a faint dot at 16px.) The transparent
  // version stays the site-wide share image below — there is no
  // app/opengraph-image.js any more, since a file-based image would override
  // these `images` entries; buildMetadata() reuses it for any entity without
  // an image of its own.
  icons: {
    icon: "/Spiritpedia_Favicon.png",
    apple: "/Spiritpedia_Favicon.png",
    shortcut: "/Spiritpedia_Favicon.png",
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
