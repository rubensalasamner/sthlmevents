import { EVENT_BUCKETS, type MeetupEvent, type MeetupNextData } from './types.js';

/**
 * Pure parser over the Meetup find-page HTML. Reads the server-rendered
 * `__NEXT_DATA__` blob and merges the event buckets by id (the same event
 * appears in several buckets). Deeper results are client-rendered and out of
 * scope, same as the Eventbrite/Luma contracts.
 */

const NEXT_DATA =
  /<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/;

function eventsFromBucket(bucket: unknown): MeetupEvent[] {
  const edges = Array.isArray(bucket)
    ? bucket
    : (bucket as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(edges)) return [];

  return edges
    .map((edge) => edge?.node ?? edge)
    .filter((event): event is MeetupEvent => Boolean(event?.id));
}

/** Merged, deduplicated events across all find-page buckets. */
export function parseMeetupEvents(html: string): MeetupEvent[] {
  const match = html.match(NEXT_DATA);
  if (!match) return [];

  let data: MeetupNextData;
  try {
    data = JSON.parse(match[1]!) as MeetupNextData;
  } catch {
    return [];
  }

  const pageProps = data.props?.pageProps;
  if (!pageProps) return [];

  const byId = new Map<string, MeetupEvent>();
  for (const bucketName of EVENT_BUCKETS) {
    for (const event of eventsFromBucket(pageProps[bucketName])) {
      if (!byId.has(event.id)) byId.set(event.id, event);
    }
  }
  return [...byId.values()];
}
