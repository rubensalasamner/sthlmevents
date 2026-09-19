import type { StockholmEvent } from '@/types/event';

export type MagazineRail = {
  id: string;
  title: string;
  events: StockholmEvent[];
  /** Featured = larger tiles under the hero; compact = secondary rails. */
  density: 'featured' | 'compact';
};

export type MagazineLayout = {
  hero: StockholmEvent | null;
  rails: MagazineRail[];
};

const RAIL_SIZE = 8;
const MIN_RAIL = 2;

/** Featured rail label — never "More all events". */
export function featuredWindowRailTitle(windowTitle: string): string {
  if (windowTitle === 'All events') return 'Up next';
  return `More ${windowTitle.toLowerCase()}`;
}

/**
 * Algorithmic magazine home: one hero, then named rails from the already
 * filtered/ranked feed. Each event appears at most once (hero or a single
 * rail) — earlier rails claim first so Free doesn't repeat window picks.
 */
export function buildMagazine(
  events: readonly StockholmEvent[],
  windowTitle: string,
): MagazineLayout {
  const hero = events.find((event) => event.isFeatured) ?? events[0] ?? null;
  const pool = hero ? events.filter((event) => event.id !== hero.id) : [...events];
  const used = new Set<string>(hero ? [hero.id] : []);

  const specs: Array<{
    id: string;
    title: string;
    density: MagazineRail['density'];
    pick: (event: StockholmEvent) => boolean;
  }> = [
    {
      id: 'window',
      title: featuredWindowRailTitle(windowTitle),
      density: 'featured',
      pick: () => true,
    },
    { id: 'free', title: 'Free', density: 'compact', pick: (event) => event.priceSek === 0 },
    {
      id: 'market',
      title: 'Markets & fleas',
      density: 'compact',
      pick: (event) => event.category === 'market',
    },
    {
      id: 'popup',
      title: 'Sales & pop-ups',
      density: 'compact',
      pick: (event) => event.category === 'popup',
    },
    { id: 'nightlife', title: 'Nightlife', density: 'compact', pick: (event) => event.category === 'nightlife' },
    { id: 'music', title: 'Music', density: 'compact', pick: (event) => event.category === 'music' },
  ];

  const rails: MagazineRail[] = [];
  for (const spec of specs) {
    const picked = pool.filter((event) => !used.has(event.id) && spec.pick(event)).slice(0, RAIL_SIZE);
    if (picked.length < MIN_RAIL) continue;
    for (const event of picked) used.add(event.id);
    rails.push({ id: spec.id, title: spec.title, events: picked, density: spec.density });
  }

  return { hero, rails };
}
