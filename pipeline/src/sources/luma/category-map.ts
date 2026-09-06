import type { EventCategory } from '../../shared/event.js';

/**
 * Luma's discovery entries carry no category, so we infer one from the title.
 * The Stockholm place skews tech/startup/community — those have no dedicated
 * category and correctly fall back to `other`. Kept as a standalone ordered
 * table (strategy) so the source owns its own mapping; first match wins.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(club|rave|nattklubb|techno|house|dj|after ?party|nightlife)\b/i, 'nightlife'],
  [/\b(concert|live music|gig|musik|band|festival|jam session)\b/i, 'music'],
  [/\b(comedy|stand-?up|improv|open mic)\b/i, 'comedy'],
  [/\b(theatre|theater|opera|dance|dans|performance)\b/i, 'theatre'],
  [/\b(dinner|brunch|supper|tasting|food|wine|coffee|fika|mingle dinner)\b/i, 'food'],
  [/\b(art|exhibition|gallery|vernissage|design|photo walk)\b/i, 'art'],
  [/\b(pop-?up|market|marknad|bazaar|sample sale)\b/i, 'market'],
  [/\b(shopping|outlet)\b/i, 'shopping'],
  [/\b(run|running|yoga|fitness|climb|hike|padel|sport|marathon)\b/i, 'sports'],
  [/\b(family|kids|children|barn)\b/i, 'family'],
];

export function mapLumaCategory(name: string): EventCategory {
  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(name)) return category;
  }
  return 'other';
}
