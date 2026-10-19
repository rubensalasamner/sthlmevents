import { useMemo } from 'react';

import { CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { loadBubbleIconUrl } from '@/utils/map-bubble-icon';
import type { MapPin } from '@/utils/map-density';
import { mapBubbleContent } from '@/utils/map-marker';
import { Colors } from '@/constants/theme';

function pinSignature(
  pin: MapPin,
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
  selectedId: string | null,
): string {
  if (pin.kind === 'cluster') {
    return `${pin.id}:${pin.count}:${uiScale}`;
  }
  const content = mapBubbleContent(pin.event, { showTitle });
  const favorite = favoriteIds.has(pin.event.id) ? '1' : '0';
  const selected = pin.event.id === selectedId ? '1' : '0';
  return `${pin.id}:${content.primary}|${content.secondary ?? ''}:${pin.event.category}:${favorite}:${selected}:${uiScale}`;
}

/**
 * Web twin of usePinIcons: same signature scheme, but returns data-URI strings
 * (Google Maps JS icon URLs) instead of expo-image ImageRefs. Pure derivation —
 * no async decode needed because the PNGs are data-URIs.
 */
export function usePinIconUrls(
  pins: readonly MapPin[],
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
  selectedId: string | null,
): ReadonlyMap<string, string> {
  const signature = pins
    .map((pin) => pinSignature(pin, showTitle, uiScale, favoriteIds, selectedId))
    .join('||');

  return useMemo(() => {
    const next = new Map<string, string>();
    for (const pin of pins) {
      try {
        if (pin.kind === 'cluster') {
          next.set(pin.id, loadBubbleIconUrl(String(pin.count), Colors.dark.accent, uiScale));
          continue;
        }
        const selected = pin.event.id === selectedId;
        const scale = selected ? uiScale * 1.35 : uiScale;
        const color = selected
          ? Colors.dark.accent
          : favoriteIds.has(pin.event.id)
            ? Colors.dark.favorite
            : CATEGORY_BADGE_COLORS[pin.event.category];
        const content = mapBubbleContent(pin.event, { showTitle });
        next.set(pin.id, loadBubbleIconUrl(content, color, scale));
      } catch {
        // Leave marker without a custom icon if the PNG fails.
      }
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by signature
  }, [signature]);
}
