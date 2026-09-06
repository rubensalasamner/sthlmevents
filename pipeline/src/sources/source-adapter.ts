import type { StockholmEvent } from '../shared/event.js';

/**
 * Strategy interface for every event source. Adapters stay deliberately dumb:
 * their only job is to fetch from one source and return normalized events.
 *
 * Shared concerns — deduplication, geocoding, ranking, persistence — are NOT
 * the adapter's responsibility. They run as separate pipeline stages over the
 * combined output of all adapters, so adding a source never touches them.
 */
export interface SourceAdapter {
  /** Stable identifier, also written to `StockholmEvent.source`. */
  readonly id: string;

  /** Fetch the current event set from this source and map it to the shared model. */
  fetch(options?: FetchOptions): Promise<StockholmEvent[]>;
}

export type FetchOptions = {
  /** Hard cap on fetched pages, mainly for development and tests. */
  maxPages?: number;
  /** Injectable fetch implementation to keep adapters testable. */
  fetchImpl?: typeof fetch;
};
