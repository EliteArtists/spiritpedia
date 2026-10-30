import PublisherLogo from './PublisherLogo.jsx';
import ListingBadges from './ListingBadges.jsx';

// School card for the Schools & Academies shelf (migration 0029). A school is a
// listing (healers.entity_type 'school'), but its picture is usually a logo, so
// it borrows the publisher card's look: the logo on its white panel, held at
// 16:9 so every card is the same height, and one meta line.
export default function SchoolCard({ school, teacherCount = 0 }) {
  const meta = [
    teacherCount > 0 ? `${teacherCount} ${teacherCount === 1 ? 'teacher' : 'teachers'}` : null,
    school.founded_year ? `Founded ${school.founded_year}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'School'; // always one line, so cards line up

  return (
    <div className="group relative h-full">
      <a
        href={`/healers/${school.healer_slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-lg transition-all hover:-translate-y-1 hover:border-[#7c3aed]/60 hover:shadow-2xl"
      >
        <div className="relative aspect-[16/9] w-full p-3">
          {/* Top left, as on every card: its tier and type, and ✓ Verified. */}
          <ListingBadges
            listing={school}
            placement="below"
            align="left"
            className="absolute top-5 left-5 z-10"
          />
          <PublisherLogo
            publisher={{ name: school.name, logo_url: school.image_urls?.[0] || null }}
            className="absolute inset-3"
            padding="px-12 pt-9 pb-4"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug text-white">{school.name}</h3>
          <p className="mt-1 text-xs text-gray-400">{meta}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#7c3aed] transition-colors group-hover:text-[#a78bfa]">
            View School &rarr;
          </span>
        </div>
      </a>
    </div>
  );
}
