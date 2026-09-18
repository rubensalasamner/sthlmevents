import type { StockholmEvent } from '@/types/event';

export type MagazineRail = {
  id: string;
  title: string;
  events: StockholmEvent[];
};

export type MagazineLayout = {
  hero: StockholmEvent | null;
  rails: MagazineRail[];
};

const RAIL_SIZE = 8;
const MIN_RAIL = 2;

/**
 * Algorithmic magazine home: one hero, then named rails from the already
 * filtered/ranked feed. Rails are not a hard filter of the city — they hide
 * the dump. Hero is featured-first, else the top of the feed.
 */
export function buildMagazine(
  events: readonly StockholmEvent[],
  windowTitle: string,
): MagazineLayout {
  const hero = events.find((event) => event.isFeatured) ?? events[0] ?? null;
  const rest = hero ? events.filter((event) => event.id !== hero.id) : [...events];

  const specs: Array<{ id: string; title: string; pick: (event: StockholmEvent) => boolean }> = [
    { id: 'window', title: windowTitle, pick: () => true },
    { id: 'free', title: 'Free', pick: (event) => event.priceSek === 0 },
    {
      id: 'market',
      title: 'Markets & pop-ups',
      pick: (event) => event.category === 'market' || event.category === 'popup',
    },
    { id: 'nightlife', title: 'Nightlife', pick: (event) => event.category === 'nightlife' },
    { id: 'music', title: 'Music', pick: (event) => event.category === 'music' },
  ];

  const rails: MagazineRail[] = [];
  for (const spec of specs) {
    const picked = rest.filter(spec.pick).slice(0, RAIL_SIZE);
    if (picked.length >= MIN_RAIL) {
      rails.push({ id: spec.id, title: spec.title, events: picked });
    }
  }

  return { hero, rails };
}
