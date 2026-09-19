import type { EventCategory } from './event.js';

/**
 * Split commerce listings: brand/warehouse sales vs flea markets.
 * Popup keywords win first so "sample sale" never lands on `market`.
 * Returns null when the text has no commerce signal.
 */
export function inferCommerceCategory(text: string): Extract<EventCategory, 'market' | 'popup'> | null {
  if (
    /\b(sample\s*sale|utförsäljning|utforrsäljning|utförsaljning|warehouse\s*sale|clearance|pop-?ups?)\b/i.test(
      text,
    )
  ) {
    return 'popup';
  }
  if (/(loppis|marknad|markets?|flea|bazaar|loppiskartan)/i.test(text)) {
    return 'market';
  }
  return null;
}
