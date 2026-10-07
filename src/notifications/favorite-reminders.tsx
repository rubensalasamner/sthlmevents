import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useFavorites } from '@/context/favorites-context';
import { getEventSource } from '@/data/event-repository';
import {
  cancelRemindersForEvent,
  rescheduleAllFavoriteReminders,
  scheduleRemindersForEvent,
} from '@/notifications/reminders';

/**
 * Subscribes to favourite membership and keeps OS reminder schedules in sync.
 * Kept out of FavoritesProvider so toggling hearts doesn't own permission UX.
 */
export function FavoriteReminders() {
  const { favoriteIds, hydrated } = useFavorites();
  const prevRef = useRef<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated) return;

    const prev = prevRef.current;
    prevRef.current = favoriteIds;

    if (prev === null) {
      if (favoriteIds.size === 0) return;
      void (async () => {
        const source = getEventSource();
        const events = (
          await Promise.all([...favoriteIds].map((id) => source.getById(id)))
        ).filter((event): event is NonNullable<typeof event> => event !== null);
        await rescheduleAllFavoriteReminders(events);
      })();
      return;
    }

    for (const id of favoriteIds) {
      if (prev.has(id)) continue;
      void (async () => {
        const event = await getEventSource().getById(id);
        if (event) await scheduleRemindersForEvent(event);
      })();
    }
    for (const id of prev) {
      if (favoriteIds.has(id)) continue;
      void cancelRemindersForEvent(id);
    }
  }, [favoriteIds, hydrated]);

  return null;
}
