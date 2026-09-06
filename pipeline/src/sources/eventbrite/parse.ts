import type { EbEvent, EbItemList } from './types.js';

/**
 * Pure parser over the Eventbrite discovery HTML. Reads the public schema.org
 * `ItemList` block rather than Eventbrite's internal `window.__SERVER_DATA__`,
 * so it tracks a documented contract instead of an implementation detail.
 */

const LD_JSON = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const TICKETS_ID = /-tickets-(\d+)/;

export function parseEventbriteEvents(html: string): EbEvent[] {
  LD_JSON.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = LD_JSON.exec(html)) !== null) {
    let data: unknown;
    try {
      data = JSON.parse(match[1]!.trim());
    } catch {
      continue;
    }

    const list = data as EbItemList;
    if (!Array.isArray(list.itemListElement)) continue;

    return list.itemListElement
      .map((element) => element.item)
      .filter((item): item is EbEvent => Boolean(item) && item['@type'] === 'Event');
  }

  return [];
}

/** Extracts the stable numeric Eventbrite id from a `...-tickets-<id>` URL. */
export function eventbriteIdFromUrl(url: string): string | null {
  return url.match(TICKETS_ID)?.[1] ?? null;
}
