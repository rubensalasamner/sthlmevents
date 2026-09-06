import type { EventSource } from '@/data/event-source';
import type { StockholmEvent } from '@/types/event';

/**
 * Tries sources in order; the first that returns a non-empty list wins.
 * Keeps the repository synchronous while the decision "remote failed -> use
 * bundled snapshot -> use mock" stays data-driven.
 */
export class FallbackEventSource implements EventSource {
  private readonly sources: readonly EventSource[];
  private active: EventSource | null = null;

  constructor(sources: readonly EventSource[]) {
    this.sources = sources;
  }

  private async resolve(): Promise<EventSource> {
    if (this.active) return this.active;
    for (const source of this.sources) {
      try {
        const events = await source.list();
        if (events.length > 0) {
          this.active = source;
          return this.active;
        }
      } catch {
        // Try the next source; remember nothing about transient failures.
      }
    }
    // Everything failed or was empty — degrade to the last source's errors
    // (or empty list) rather than inventing data.
    this.active = this.sources[this.sources.length - 1]!;
    return this.active;
  }

  get attribution(): string | null {
    // Synchronous best-effort: the active source's attribution, else null.
    return this.active?.attribution ?? null;
  }

  async list(): Promise<StockholmEvent[]> {
    const source = await this.resolve();
    return source.list();
  }

  async getById(id: string): Promise<StockholmEvent | null> {
    const source = await this.resolve();
    return source.getById(id);
  }
}
