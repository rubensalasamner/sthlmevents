/**
 * Curated Instagram accounts that post Stockholm event flyers (sample sales,
 * archives, etc.) with dates/venues in the caption. Add usernames here only
 * after a probe confirms captions are parseable without OCR.
 *
 * Cost: apify/instagram-post-scraper charges ~$0.0027/post (free plan, verified
 * 2026-09-17). resultsLimit is applied across the username list as the actor's
 * per-profile cap — keep the list short.
 */
export const CURATED_IG_PROFILES = ['stockholm_samplesale'] as const;

export type CuratedIgProfile = (typeof CURATED_IG_PROFILES)[number];
