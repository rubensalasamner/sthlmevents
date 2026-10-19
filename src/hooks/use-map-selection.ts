import { useEffect, useMemo, useState } from 'react';

import type { StockholmEvent } from '@/types/event';

/** Uncontrolled selection when the screen does not own it (native + web parity). */
export function useMapSelection(events: StockholmEvent[], focusEventId: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(focusEventId);

  // Sync focus deep links (arrive between renders) and drop stale selections.
  // Mirrors the historical native behavior; intentional setState-in-effect.
  useEffect(() => {
    if (focusEventId && events.some((event) => event.id === focusEventId)) {
      queueMicrotask(() => setSelectedId(focusEventId));
    }
  }, [focusEventId, events]);

  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      queueMicrotask(() => setSelectedId(null));
    }
  }, [events, selectedId]);

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId],
  );

  return {
    selectedId,
    selected,
    select: setSelectedId,
    clear: () => setSelectedId(null),
  };
}
