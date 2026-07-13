import ShelfRow from './ShelfRow.js';

// Reusable horizontal-scroll shelf. Every homepage row (healers, books, courses,
// retreats, downloads, free resources) is one of these — the only thing that
// changes is the card renderer and the fixed track width each card occupies.
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
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  if (list.length === 0 && emptyHide) return null;

  // min-w-0 lets this section shrink to its grid track. Without it the section's
  // automatic minimum size is its content's min-content width — the full width of
  // every card in the row — and the scroll track never actually scrolls.
  return (
    <section className="min-w-0">
      <ShelfRow title={title} subtitle={subtitle} seeAllHref={seeAllHref} />

      <div className="flex flex-row gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2">
        {list.map((item, index) => (
          <div key={item.id ?? index} className={`shrink-0 snap-start ${itemWidthClass}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </section>
  );
}
