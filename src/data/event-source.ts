import type { StockholmEvent } from '@/types/event';

/**
 * Strategy interface for anything that can supply events.
 *
 * Swap the concrete implementation (mock, REST API, GraphQL, cache…) in
 * `event-repository.ts` without touching the UI or hooks.
 */
export interface EventSource {
  /** Data-source credits (e.g. CC BY 4.0 attribution); null when none. */
  readonly attribution: string | null;
  list(): Promise<StockholmEvent[]>;
  getById(id: string): Promise<StockholmEvent | null>;
}
