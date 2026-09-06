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
 * Defaults to the remote snapshot URL (daily-cron model) when configured via
 * `EXPO_PUBLIC_SNAPSHOT_URL`, falling back to the bundled snapshot and then
 * mock data. Without the env var the bundled snapshot is used directly.
 */

const REMOTE_URL = process.env.EXPO_PUBLIC_SNAPSHOT_URL;

const snapshotSource = new StaticEventSource();

function createDefaultSource(): EventSource {
  if (!REMOTE_URL) return snapshotSource;
  return new FallbackEventSource([
    new RemoteEventSource(REMOTE_URL),
    snapshotSource,
    new MockEventSource(),
  ]);
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
