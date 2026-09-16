import { ImageResponse } from 'next/og';
import { DEFAULT_DESCRIPTION } from '@/utils/seo';

// Site-wide fallback share image, rendered by Next at build time from this
// JSX. It applies to every route that does not set its own openGraph.images —
// the homepage, subject pages, and any entity without a usable photo. Uses the
// nav's dark ground and the wordmark's blue→pink gradient as an accent bar,
// since Satori (the renderer) cannot load the wordmark PNG without a fetch.

export const alt = 'Spiritpedia — Discover Wisdom. Explore Consciousness.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px 96px',
          background: 'linear-gradient(135deg, #0a0f1d 0%, #1a1033 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: 160,
            height: 8,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
            marginBottom: 40,
          }}
        />
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: 6,
            lineHeight: 1,
            marginBottom: 32,
          }}
        >
          SPIRITPEDIA
        </div>
        <div style={{ fontSize: 40, fontWeight: 600, color: '#e5e7eb', marginBottom: 20 }}>
          Discover Wisdom. Explore Consciousness.
        </div>
        <div style={{ fontSize: 28, color: '#9ca3af' }}>{DEFAULT_DESCRIPTION}</div>
      </div>
    ),
    { ...size }
  );
}
