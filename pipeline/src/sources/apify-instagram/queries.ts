/**
 * Queries for the Instagram long-tail source. Same tier discipline as the
 * Facebook source (`../apify-facebook/queries.ts`): start narrow, add terms
 * only when a term's unique-yield (events surviving dedup against FB and
 * other sources) justifies its cost share.
 *
 * Verified 2026-09-16 (31-post probe): `keywordSearch: true` treats each entry
 * as a KEYWORD search — needed for multi-word phrases like "sample sale
 * Stockholm". Plain hashtag terms (no spaces) work in both modes; hashtags[]
 * is the actor's only input channel.
 *
 * Cost: $0.0026/post, resultsLimit is PER TERM. 4 terms x 20 = worst case
 * 80 posts ≈ $0.21/run.
 */
export const APIFY_IG_QUERIES_TIER1 = [
  'loppis Stockholm',
  'utförsäljning Stockholm',
  'sample sale Stockholm',
  'loppisstockholm',
] as const;

export const APIFY_IG_QUERIES_TIER2 = [
  'pop up Stockholm',
  'stockholmevents',
  'vinylloppis Stockholm',
  'marknad Stockholm',
] as const;

export type ApifyIgQueryTier = 'tier1' | 'tier2';

export function igQueriesForTier(tier: ApifyIgQueryTier): readonly string[] {
  return tier === 'tier1' ? APIFY_IG_QUERIES_TIER1 : APIFY_IG_QUERIES_TIER2;
}
