import { FallbackEventSource } from '@/data/fallback-event-source';
import { MockEventSource } from '@/data/mock-event-source';
import { RemoteEventSource } from '@/data/remote-event-source';
import { StaticEventSource } from '@/data/static-event-source';
import type { EventSource } from '@/data/event-source';

/**
 * Single access point for event data. The rest of the app depends only on this
 * repository, never on a concrete source. Swap the strategy here (or via
 * `setEventSource`) when a real API is ready.
 *
 * Daily-cron model: try the remote snapshot (`EXPO_PUBLIC_SNAPSHOT_URL`,
 * hosted on R2), then the bundled snapshot when the pipeline file was bundled
 * in (EAS builds exclude it via `.easignore`), then mock data. Sources that
 * resolve empty — including a missing snapshot file — are skipped by the
 * fallback chain.
 */

const REMOTE_URL = process.env.EXPO_PUBLIC_SNAPSHOT_URL;

function createDefaultSource(): EventSource {
  const sources: EventSource[] = [];
  if (REMOTE_URL) sources.push(new RemoteEventSource(REMOTE_URL));
  sources.push(new StaticEventSource(), new MockEventSource());
  return sources.length === 1 ? sources[0]! : new FallbackEventSource(sources);
}

let activeSource: EventSource | null = null;

function resolveActive(): EventSource {
  if (!activeSource) activeSource = createDefaultSource();
  return activeSource;
}

export function setEventSource(source: EventSource): void {
  activeSource = source;
}

export function getEventSource(): EventSource {
  return resolveActive();
}
