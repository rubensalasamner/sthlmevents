import type { EventCategory } from '../../shared/event.js';

/**
 * Eventbrite's list-page JSON-LD carries no category, so we infer one from the
 * title/description. Title first (body copy often name-drops "music"); theatre
 * before music; `\bteater` matches compounds. Unmatched → `other`.
 */

const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(klubb|club|rave|nattklubb|techno|house|afterwork)\b/i, 'nightlife'],
  [/\b(comedy|stand-?up|ståuppkomik|humor)\b/i, 'comedy'],
  [/\bteater|\b(theatre|theater|scen|performance|opera|dans|dance)\b/i, 'theatre'],
  [/\b(konsert|concert|live music|gig|musik|band|festival)\b/i, 'music'],
  [/\b(mat|food|middag|dinner|tasting|provning|wine|vin|brunch|restaurang)\b/i, 'food'],
  [/\b(konst|art|utställning|exhibition|gallery|galleri|vernissage)\b/i, 'art'],
  [/\b(sample sale|utförsäljning|warehouse sale|pop-?ups?)\b/i, 'popup'],
  [/\b(marknad|market|loppis|bazaar|flea)\b/i, 'market'],
  [/\b(shopping|outlet|rea)\b/i, 'shopping'],
  [/\b(sport|match|race|lopp|yoga|fitness|träning|run|marathon)\b/i, 'sports'],
  [/\b(familj|family|barn|kids|children)\b/i, 'family'],
];

/** Description: bare "musik"/"music" is too weak (incidental mentions). */
const DESCRIPTION_KEYWORDS: readonly (readonly [RegExp, EventCategory])[] = KEYWORD_TO_CATEGORY.map(
  ([pattern, category]) =>
    category === 'music'
      ? ([/\b(konsert|concert|live music|gig|band|festival)\b/i, category] as const)
      : ([pattern, category] as const),
);

function firstMatch(
  haystack: string,
  rules: readonly (readonly [RegExp, EventCategory])[],
): EventCategory | null {
  for (const [pattern, category] of rules) {
    if (pattern.test(haystack)) return category;
  }
  return null;
}

export function mapEventbriteCategory(name: string, description = ''): EventCategory {
  return firstMatch(name, KEYWORD_TO_CATEGORY) ?? firstMatch(description, DESCRIPTION_KEYWORDS) ?? 'other';
}
