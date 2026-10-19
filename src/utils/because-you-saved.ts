import type { StockholmEvent } from '@/types/event';
import { RELATED_STRATEGIES } from '@/utils/related-events';

const RAIL_LIMIT = 8;
const MIN_RAIL = 2;
const MAX_ANCHORS = 5;

/**
 * Home rail seeded from recent saved events: reuse venue/organizer/nearby
 * related strategies so the section is explainable ("Because you saved …").
 */
export function buildBecauseYouSavedRail(
  savedAnchors: readonly StockholmEvent[],
  candidates: readonly StockholmEvent[],
  now: Date,
  usedIds: ReadonlySet<string> = new Set(),
): { title: string; events: StockholmEvent[] } | null {
  if (savedAnchors.length === 0) return null;

  const anchors = savedAnchors.slice(0, MAX_ANCHORS);
  const picked: StockholmEvent[] = [];
  const seen = new Set<string>(usedIds);

  for (const anchor of anchors) {
    for (const strategy of RELATED_STRATEGIES) {
      for (const related of strategy.pick(anchor, candidates, now)) {
        if (seen.has(related.id) || related.id === anchor.id) continue;
        seen.add(related.id);
        picked.push(related);
        if (picked.length >= RAIL_LIMIT) break;
      }
      if (picked.length >= RAIL_LIMIT) break;
    }
    if (picked.length >= RAIL_LIMIT) break;
  }

  if (picked.length < MIN_RAIL) return null;

  const labelAnchor = anchors[0]!;
  const venue = labelAnchor.venue.name.trim();
  const title = venue.length > 0 ? `Because you saved · ${venue}` : 'Because you saved';

  return { title, events: picked.slice(0, RAIL_LIMIT) };
}
