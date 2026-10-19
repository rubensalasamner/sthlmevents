import { useMemo } from 'react';

import { MAP_BUBBLE_SCALE, mapBubbleSizeTier, MAP_TITLE_MAX_EVENTS, MAP_TITLE_ZOOM } from '@/utils/map-marker';

/** Shared native/web: when titles unlock and which bubble scale applies. */
export function useBubbleMode(zoom: number, totalEvents: number) {
  return useMemo(
    () => ({
      showTitles: totalEvents <= MAP_TITLE_MAX_EVENTS || zoom >= MAP_TITLE_ZOOM,
      uiScale: MAP_BUBBLE_SCALE[mapBubbleSizeTier(zoom)],
    }),
    [zoom, totalEvents],
  );
}
