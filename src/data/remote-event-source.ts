import type { EventSource } from '@/data/event-source';
import type { StockholmEvent } from '@/types/event';

type SnapshotFile = {
  events: StockholmEvent[];
  generatedAt?: string;
  attribution?: string;
};

/**
 * Serves events from a snapshot JSON hosted over HTTP (the daily-cron model:
 * the pipeline regenerates and uploads the snapshot, the app fetches it).
 *
 * The payload is loaded once per instantiation and kept in memory; failed
 * fetches surface as `list()` rejections so the caller can fall back to
 * another source (see `event-repository.ts`). Events already ended are
 * filtered out, matching `StaticEventSource`.
 */
export class RemoteEventSource implements EventSource {
  private readonly eventsPromise: Promise<StockholmEvent[]>;
  private loadedAttribution: string | null = null;

  constructor(url: string, fetchImpl: typeof fetch = fetch) {
    const load = async (): Promise<StockholmEvent[]> => {
      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Snapshot fetch failed: ${response.status} ${url}`);
      }
      const snapshot = (await response.json()) as SnapshotFile;
      this.loadedAttribution = snapshot.attribution ?? null;
      const now = Date.now();
      return (snapshot.events ?? [])
        .filter((event) => new Date(event.endsAt ?? event.startsAt).getTime() >= now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    };

    this.eventsPromise = load();
  }

  get attribution(): string | null {
    return this.loadedAttribution;
  }

  async list(): Promise<StockholmEvent[]> {
    return this.eventsPromise;
  }

  async getById(id: string): Promise<StockholmEvent | null> {
    const events = await this.eventsPromise;
    return events.find((event) => event.id === id) ?? null;
  }
}
