import type { EventCategory } from '../../shared/event.js';

/**
 * Meetup's find-page events carry no category (groups have topics, but the
 * bucket payload doesn't include them), so we infer one from the title — group
 * names skew "other" on this contract.
 *
 * Dance socials (salsa/bachata/…) stay under music and are listed before the
 * theatre rule so `\bdance\b` does not steal them. Straight theatre/performance
 * titles still hit theatre first among the remaining rules.
 */
const KEYWORD_TO_CATEGORY: readonly (readonly [RegExp, EventCategory])[] = [
  [/\b(club|clubbing|techno|house|rave|dj|after ?party)\b/i, 'nightlife'],
  [/\b(comedy|stand-?up|improv)\b/i, 'comedy'],
  [/\b(salsa|bachata|kizomba|tango|swing|karaoke|open mic|jam)\b/i, 'music'],
  [/\b(theatre|theater|opera|performance)\b/i, 'theatre'],
  [/\b(concert|live music|gig|music|band|dance|dans)\b/i, 'music'],
  [/\b(dinner|brunch|supper|tasting|food|wine|coffee|fika|bbq)\b/i, 'food'],
  [/\b(art|exhibition|gallery|vernissage|design|photography|photo walk)\b/i, 'art'],
  [/\b(sample sale|utförsäljning|warehouse sale|pop-?ups?)\b/i, 'popup'],
  [/\b(market|marknad|bazaar|flea|loppis)\b/i, 'market'],
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
