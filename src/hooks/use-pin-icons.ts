import type { ImageRef } from 'expo-image';
import { useEffect, useState } from 'react';

import { Colors } from '@/constants/theme';
import { CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { loadBubbleIcon } from '@/utils/map-bubble-icon';
import type { MapPin } from '@/utils/map-density';
import { mapBubbleContent } from '@/utils/map-marker';

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

export function usePinIcons(
  pins: readonly MapPin[],
  showTitle: boolean,
  uiScale: number,
  favoriteIds: ReadonlySet<string>,
  selectedId: string | null,
) {
  const [icons, setIcons] = useState<ReadonlyMap<string, ImageRef>>(new Map());
  const signature = pins
    .map((pin) => pinSignature(pin, showTitle, uiScale, favoriteIds, selectedId))
    .join('||');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const next = new Map<string, ImageRef>();
      await Promise.all(
        pins.map(async (pin) => {
          try {
            if (pin.kind === 'cluster') {
              next.set(
                pin.id,
                await loadBubbleIcon({ primary: String(pin.count) }, Colors.dark.accent, uiScale),
              );
              return;
            }
            const selected = pin.event.id === selectedId;
            const scale = selected ? uiScale * 1.35 : uiScale;
            const color = selected
              ? Colors.dark.accent
              : favoriteIds.has(pin.event.id)
                ? Colors.dark.favorite
                : CATEGORY_BADGE_COLORS[pin.event.category];
            const content = mapBubbleContent(pin.event, { showTitle });
            next.set(pin.id, await loadBubbleIcon(content, color, scale));
          } catch {
            // Leave marker without a custom icon if the PNG fails to decode.
          }
        }),
      );
      if (!cancelled) setIcons(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by signature
  }, [signature]);

  return icons;
}
