import type { EventCategory } from '../../shared/event.js';

/**
 * Meetup's find-page events carry no category (groups have topics, but the
 * bucket payload doesn't include them), so we infer one from the title — group
 * names skew "other" on this contract. Kept standalone so the source owns its
 * own mapping; first match wins.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(club|clubbing|techno|house|rave|dj|after ?party)\b/i, 'nightlife'],
  [/\b(concert|live music|gig|music|band|jam|open mic|karaoke|salsa|bachata|kizomba|tango|swing)\b/i, 'music'],
  [/\b(comedy|stand-?up|improv)\b/i, 'comedy'],
  [/\b(theatre|theater|opera|dance|dans|performance)\b/i, 'theatre'],
  [/\b(dinner|brunch|supper|tasting|food|wine|coffee|fika|bbq)\b/i, 'food'],
  [/\b(art|exhibition|gallery|vernissage|design|photography|photo walk)\b/i, 'art'],
  [/\b(pop-?up|market|marknad|bazaar|flea)\b/i, 'market'],
  [/\b(shopping|outlet)\b/i, 'shopping'],
  [/\b(run|running|yoga|fitness|climb|hike|hiking|padel|sport|football|soccer|volleyball|badminton)\b/i, 'sports'],
  [/\b(family|kids|children|barn)\b/i, 'family'],
];

export function mapMeetupCategory(title: string): EventCategory {
  for (const [pattern, category] of KEYWORD_TO_CATEGORY) {
    if (pattern.test(title)) return category;
  }
  return 'other';
}
