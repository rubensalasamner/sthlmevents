/**
 * Long-tail keyword queries for the Apify Facebook Events source.
 *
 * Rationale: a plain "Stockholm" search returns mainstream events already
 * covered by Visit Stockholm and other planned sources. These queries target
 * event archetypes that source does NOT carry. Each query is a standalone
 * Apify run input; the pipeline runs one actor run per query per schedule.
 *
 * Rules for keeping costs down:
 *  - Start with TIER 1 (4 queries). Add TIER 2 only when a tier's yield
 *    (unique events surviving dedupe) justifies its share of the $5 credit.
 *  - All queries run inside ONE actor run (windowed search URLs); Apify
 *    charges $0.001 per run start + $0.013 per event returned, across all
 *    queries combined.
 *  - Swedish queries should be `keyword Stockholm` (city word included);
 *    the actor applies Facebook's own location filter, but the word helps.
 */
export const APIFY_QUERIES_TIER1 = [
  'sample sale Stockholm',
  'loppis Stockholm',
  'utförsäljning Stockholm',
  'pop up shop Stockholm',
] as const;

export const APIFY_QUERIES_TIER2 = [
  'quiz Stockholm',
  'standup Stockholm',
  'workshop keramik Stockholm',
  'brunch Stockholm',
  'föreläsning Stockholm',
] as const;

export type ApifyQueryTier = 'tier1' | 'tier2';

export function queriesForTier(tier: ApifyQueryTier): readonly string[] {
  return tier === 'tier1' ? APIFY_QUERIES_TIER1 : APIFY_QUERIES_TIER2;
}
