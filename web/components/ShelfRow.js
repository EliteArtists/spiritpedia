// Shelf header — section title on the left, "See all" affordance on the right.
// Split out from ContentShelf so the videos grid can share the identical heading
// treatment without inheriting the horizontal scroll container.
export default function ShelfRow({ title, subtitle, seeAllHref }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        {subtitle && (
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{subtitle}</p>
        )}
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>

      {seeAllHref && (
        <a
          href={seeAllHref}
          className="shrink-0 text-sm font-semibold text-[#7c3aed] hover:text-[#a78bfa] transition-colors whitespace-nowrap"
        >
          See all &rarr;
        </a>
      )}
    </div>
  );
}
