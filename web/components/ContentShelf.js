import ShelfRow from './ShelfRow.js';
import ShelfTrack from './ShelfTrack.jsx';

// Reusable horizontal-scroll shelf. Every homepage row (healers, books, courses,
// retreats, downloads, free resources) is one of these — the only thing that
// changes is the card renderer and the fixed track width each card occupies.
//
// `note` is an optional line under the heading (Practitioners Near You's area).
//
// `emptyHide` is the default: a shelf whose query came back with nothing renders
// nothing at all rather than an empty heading over blank space.
export default function ContentShelf({
  title,
  subtitle,
  items,
  seeAllHref,
  renderItem,
  itemWidthClass = 'w-[300px]',
  emptyHide = true,
  badge,
  note,
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (list.length === 0 && emptyHide) return null;

  // min-w-0 lets this section shrink to its grid track. Without it the section's
  // automatic minimum size is its content's min-content width — the full width of
  // every card in the row — and the scroll track never actually scrolls.
  return (
    <section className="min-w-0">
      <ShelfRow title={title} subtitle={subtitle} seeAllHref={seeAllHref} badge={badge} />
      {/* A line under the heading: "Near London · Change", "Set your area". */}
      {note && <div className="-mt-2 mb-4">{note}</div>}

      {/* Draws the cards a page at a time as the row scrolls (ShelfTrack.jsx). */}
      <ShelfTrack>
        {list.map((item, index) => (
          <div
            key={item.id ?? index}
            // The first six always render (they size the row); the rest are
            // skipped while off screen — see .shelf-item-deferred.
            className={`shrink-0 snap-start ${itemWidthClass}${index >= 6 ? ' shelf-item-deferred' : ''}`}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </ShelfTrack>
    </section>
  );
}
