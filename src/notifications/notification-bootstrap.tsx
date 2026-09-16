import type { NotificationResponse } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { configureNotificationHandler } from '@/notifications/reminders';

/**
 * Sets the foreground notification handler and routes taps on a reminder
 * into the matching event detail screen. Mount once under the root layout.
 */
export function NotificationBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let responseSub: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      await configureNotificationHandler();
      const Notifications = await import('expo-notifications');
      if (cancelled) return;

      const openFromResponse = (response: NotificationResponse) => {
        const eventId = response.notification.request.content.data?.eventId;
        if (typeof eventId === 'string' && eventId.length > 0) {
          router.push(`/event/${eventId}`);
        }
      };

      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) openFromResponse(last);

      responseSub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    })();

    return () => {
      cancelled = true;
      responseSub?.remove();
    };
  }, [router]);

  return null;
}
