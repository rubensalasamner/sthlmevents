import type { EventCategory, StockholmEvent } from '@/types/event';
import { buildBecauseYouSavedRail } from '@/utils/because-you-saved';

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

export type MagazineOptions = {
  preferredCategories?: ReadonlySet<EventCategory>;
  /** Decayed category affinity scores; used to order thematic rails + For you. */
  categoryScores?: ReadonlyMap<EventCategory, number>;
  /** Recent favourites used to seed the "Because you saved" rail. */
  savedAnchors?: readonly StockholmEvent[];
  now?: Date;
};

const RAIL_SIZE = 8;
const MIN_RAIL = 2;
/** Minimum affinity (or vibes match) before a For you rail appears. */
const FOR_YOU_SCORE_FLOOR = 0.5;

type ThematicSpec = {
  id: string;
  title: string;
  category: EventCategory | null;
  density: MagazineRail['density'];
  pick: (event: StockholmEvent) => boolean;
};

/** Category to apply when tapping See all on a thematic rail. */
export function railCategoryFilter(railId: string): EventCategory | null {
  switch (railId) {
    case 'for-you':
      return null;
    case 'because-saved':
      return null;
    case 'market':
      return 'market';
    case 'popup':
      return 'popup';
    case 'nightlife':
      return 'nightlife';
    case 'music':
      return 'music';
    case 'theatre':
      return 'theatre';
    case 'comedy':
      return 'comedy';
    case 'art':
      return 'art';
    case 'food':
      return 'food';
    case 'family':
      return 'family';
    default:
      return null;
  }
}

/**
 * Window + Free + For you mix categories; thematic rails already name the type
 * in the heading — badge only where the heading doesn't say it.
 */
export function railShowsCategory(railId: string): boolean {
  return railId === 'window' || railId === 'free' || railId === 'for-you' || railId === 'because-saved';
}

/** Featured rail label — never "More all events". */
export function featuredWindowRailTitle(windowTitle: string): string {
  if (windowTitle === 'All events') return 'Up next';
  return `More ${windowTitle.toLowerCase()}`;
}

function categoryScore(
  category: EventCategory,
  preferred: ReadonlySet<EventCategory> | undefined,
  scores: ReadonlyMap<EventCategory, number> | undefined,
): number {
  const learned = scores?.get(category) ?? 0;
  const vibe = preferred?.has(category) ? 10 : 0;
  return vibe + learned;
}

function isForYouEvent(
  event: StockholmEvent,
  preferred: ReadonlySet<EventCategory> | undefined,
  scores: ReadonlyMap<EventCategory, number> | undefined,
): boolean {
  if (preferred?.has(event.category)) return true;
  return (scores?.get(event.category) ?? 0) >= FOR_YOU_SCORE_FLOOR;
}

function pickHero(
  events: readonly StockholmEvent[],
  preferred: ReadonlySet<EventCategory> | undefined,
  scores: ReadonlyMap<EventCategory, number> | undefined,
): StockholmEvent | null {
  if (events.length === 0) return null;
  const featuredPreferred = events.find(
    (event) => event.isFeatured && isForYouEvent(event, preferred, scores),
  );
  if (featuredPreferred) return featuredPreferred;
  const featured = events.find((event) => event.isFeatured);
  if (featured) return featured;
  const preferredFirst = events.find((event) => isForYouEvent(event, preferred, scores));
  return preferredFirst ?? events[0] ?? null;
}

/**
 * Algorithmic magazine home: one hero, then named rails from the already
 * filtered/ranked feed. Each event appears at most once (hero or a single
 * rail) — earlier rails claim first so Free doesn't repeat window picks.
 *
 * With affinity/vibes: inserts For you + Because you saved, and reorders
 * thematic rails by category affinity.
 */
export function buildMagazine(
  events: readonly StockholmEvent[],
  windowTitle: string,
  options: MagazineOptions = {},
): MagazineLayout {
  const preferred = options.preferredCategories;
  const scores = options.categoryScores;
  const now = options.now ?? new Date();

  const hero = pickHero(events, preferred, scores);
  const pool = hero ? events.filter((event) => event.id !== hero.id) : [...events];
  const used = new Set<string>(hero ? [hero.id] : []);

  const rails: MagazineRail[] = [];

  const forYouEvents = pool
    .filter((event) => !used.has(event.id) && isForYouEvent(event, preferred, scores))
    .slice(0, RAIL_SIZE);
  if (forYouEvents.length >= MIN_RAIL) {
    for (const event of forYouEvents) used.add(event.id);
    rails.push({
      id: 'for-you',
      title: 'For you',
      events: forYouEvents,
      density: 'featured',
    });
  }

  if (options.savedAnchors && options.savedAnchors.length > 0) {
    const because = buildBecauseYouSavedRail(options.savedAnchors, pool, now, used);
    if (because) {
      for (const event of because.events) used.add(event.id);
      rails.push({
        id: 'because-saved',
        title: because.title,
        events: because.events,
        density: 'compact',
      });
    }
  }

  const thematic: ThematicSpec[] = [
    {
      id: 'window',
      title: featuredWindowRailTitle(windowTitle),
      category: null,
      density: 'featured',
      pick: () => true,
    },
    { id: 'free', title: 'Free', category: null, density: 'compact', pick: (event) => event.priceSek === 0 },
    {
      id: 'market',
      title: 'Markets & fleas',
      category: 'market',
      density: 'compact',
      pick: (event) => event.category === 'market',
    },
    {
      id: 'popup',
      title: 'Sales & pop-ups',
      category: 'popup',
      density: 'compact',
      pick: (event) => event.category === 'popup',
    },
    {
      id: 'nightlife',
      title: 'Nightlife',
      category: 'nightlife',
      density: 'compact',
      pick: (event) => event.category === 'nightlife',
    },
    {
      id: 'music',
      title: 'Music',
      category: 'music',
      density: 'compact',
      pick: (event) => event.category === 'music',
    },
    {
      id: 'theatre',
      title: 'Theatre',
      category: 'theatre',
      density: 'compact',
      pick: (event) => event.category === 'theatre',
    },
    {
      id: 'comedy',
      title: 'Comedy',
      category: 'comedy',
      density: 'compact',
      pick: (event) => event.category === 'comedy',
    },
    {
      id: 'art',
      title: 'Art',
      category: 'art',
      density: 'compact',
      pick: (event) => event.category === 'art',
    },
    {
      id: 'food',
      title: 'Food & drink',
      category: 'food',
      density: 'compact',
      pick: (event) => event.category === 'food',
    },
    {
      id: 'family',
      title: 'Family',
      category: 'family',
      density: 'compact',
      pick: (event) => event.category === 'family',
    },
  ];

  // Keep window + free fixed at the front of the thematic block; reorder the rest by affinity.
  const fixed = thematic.filter((spec) => spec.id === 'window' || spec.id === 'free');
  const orderedRest = thematic
    .filter((spec) => spec.id !== 'window' && spec.id !== 'free')
    .sort((a, b) => {
      const scoreA = a.category ? categoryScore(a.category, preferred, scores) : 0;
      const scoreB = b.category ? categoryScore(b.category, preferred, scores) : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return 0;
    });

  for (const spec of [...fixed, ...orderedRest]) {
    const picked = pool.filter((event) => !used.has(event.id) && spec.pick(event)).slice(0, RAIL_SIZE);
    if (picked.length < MIN_RAIL) continue;
    for (const event of picked) used.add(event.id);
    rails.push({ id: spec.id, title: spec.title, events: picked, density: spec.density });
  }

  return { hero, rails };
}
