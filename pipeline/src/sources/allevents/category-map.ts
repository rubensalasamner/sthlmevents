import type { EventCategory } from '../../shared/event.js';
import type { AeEvent } from './types.js';

/**
 * allevents.in tags events with its own free-form category slugs (mixed case,
 * often several per event) plus a `merged_lookup`. We match those and the title
 * against an ordered table; first match wins, so specific music/nightlife tags
 * beat the generic `entertainment`. Kept standalone so the source owns its map.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(rave|parties|party|club|clubbing|nattklubb|techno|house|dj)\b/i, 'nightlife'],
  [/\b(concert|concerts|live-?music|gig|music|musik|festival)\b/i, 'music'],
  [/\b(comedy|stand-?up|standup|improv)\b/i, 'comedy'],
  [/\b(theatre|theater|performances?|opera|dance|dans|ballet)\b/i, 'theatre'],
  [/\b(food|dining|dinner|tasting|wine|brunch|restaurant)\b/i, 'food'],
  [/\b(art|arts|art exhibitions?|utställning|gallery|galleri|vernissage|design)\b/i, 'art'],
  [/\b(market|markets|marknad|pop-?up|flea|loppis|bazaar)\b/i, 'market'],
  [/\b(shopping|outlet|sale)\b/i, 'shopping'],
  [/\b(sports?|running|marathon|fitness|yoga|tournaments?|match|race)\b/i, 'sports'],
  [/\b(family|kids|children|barn)\b/i, 'family'],
];

export function mapAlleventsCategory(raw: AeEvent): EventCategory {
  const text = [
    raw.eventname,
    ...(raw.categories ?? []),
    ...(raw.custom_params?.merged_lookup ?? []),
  ].join(' ');

  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}
