import type { EventCategory } from '../../shared/event.js';

/**
 * Eventbrite's list-page JSON-LD carries no category, so we infer one from the
 * title/description. Kept as a standalone ordered table (strategy) so the
 * source owns its own mapping. First matching pattern wins; unmatched events
 * (e.g. business/networking) fall back to `other`.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(klubb|club|rave|nattklubb|techno|house|afterwork)\b/i, 'nightlife'],
  [/\b(konsert|concert|live music|gig|musik|band|festival)\b/i, 'music'],
  [/\b(comedy|stand-?up|ståuppkomik|humor)\b/i, 'comedy'],
  [/\b(teater|theatre|theater|scen|performance|opera|dans|dance)\b/i, 'theatre'],
  [/\b(mat|food|middag|dinner|tasting|provning|wine|vin|brunch|restaurang)\b/i, 'food'],
  [/\b(konst|art|utställning|exhibition|gallery|galleri|vernissage)\b/i, 'art'],
  [/\b(sample sale|pop-?up|marknad|market|loppis|bazaar)\b/i, 'market'],
  [/\b(shopping|outlet|rea)\b/i, 'shopping'],
  [/\b(sport|match|race|lopp|yoga|fitness|träning|run|marathon)\b/i, 'sports'],
  [/\b(familj|family|barn|kids|children)\b/i, 'family'],
];

export function mapEventbriteCategory(name: string, description = ''): EventCategory {
  const text = `${name} ${description}`;
  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}
