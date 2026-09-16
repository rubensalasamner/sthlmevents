import { Platform } from 'react-native';

import type { StockholmEvent } from '@/types/event';
import { formatEventDate, formatEventTimeRange } from '@/utils/format';
import {
  reminderFireTimes,
  reminderNotificationId,
  type ReminderKind,
} from '@/notifications/reminder-times';

const CHANNEL_ID = 'event-reminders';

/** Lazy-load so web / tests that never touch reminders don't pull native code. */
async function Notifications() {
  return import('expo-notifications');
}

/**
 * Present banners while the app is foregrounded. Called once at startup
 * (native only) — without it scheduled notifications are silently dropped
 * when the app is open.
 */
export async function configureNotificationHandler(): Promise<void> {
  if (Platform.OS === 'web') return;
  const NotificationsMod = await Notifications();
  NotificationsMod.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Ensure the Android channel exists and the OS permission is granted.
 * Returns false on web / denied — favourites still save; reminders just skip.
 * Request is deferred to the first favourite (not app launch).
 */
export async function ensureReminderPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const NotificationsMod = await Notifications();

  if (Platform.OS === 'android') {
    await NotificationsMod.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Event reminders',
      description: 'Reminders for events you have saved',
      importance: NotificationsMod.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await NotificationsMod.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === NotificationsMod.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  if (!current.canAskAgain && current.status === 'denied') {
    return false;
  }
  const requested = await NotificationsMod.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === NotificationsMod.IosAuthorizationStatus.PROVISIONAL
  );
}

function bodyFor(kind: ReminderKind, event: StockholmEvent): { title: string; body: string } {
  const when = `${formatEventDate(event.startsAt)} · ${formatEventTimeRange(event)}`;
  const where = event.venue.name;
  if (kind === 'day-before') {
    return {
      title: 'Tomorrow: ' + event.title,
      body: `${when} · ${where}`,
    };
  }
  return {
    title: 'Starting soon: ' + event.title,
    body: `${when} · ${where}`,
  };
}

/**
 * Cancel any previously scheduled reminders for this event, then schedule
 * whatever fire times are still in the future. No-ops without permission —
 * favourites still save; we never cancel existing schedules before knowing
 * we can recreate them.
 */
export async function scheduleRemindersForEvent(event: StockholmEvent): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureReminderPermissions();
  if (!granted) return;

  await cancelRemindersForEvent(event.id);

  const NotificationsMod = await Notifications();
  const fires = reminderFireTimes(event.startsAt);
  for (const fire of fires) {
    const { title, body } = bodyFor(fire.kind, event);
    await NotificationsMod.scheduleNotificationAsync({
      identifier: reminderNotificationId(event.id, fire.kind),
      content: {
        title,
        body,
        data: { eventId: event.id },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
      trigger: {
        type: NotificationsMod.SchedulableTriggerInputTypes.DATE,
        date: fire.at,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null),
      },
    });
  }
}

export async function cancelRemindersForEvent(eventId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const NotificationsMod = await Notifications();
  const kinds: ReminderKind[] = ['day-before', 'hours-before'];
  await Promise.all(
    kinds.map((kind) =>
      NotificationsMod.cancelScheduledNotificationAsync(reminderNotificationId(eventId, kind)).catch(
        () => {
          // No scheduled notification for this id — fine.
        },
      ),
    ),
  );
}

/**
 * Re-schedule reminders for every favourited upcoming event. Called after
 * hydration so OS-cleared schedules (reinstall, permission revoke) recover.
 */
export async function rescheduleAllFavoriteReminders(
  events: readonly StockholmEvent[],
): Promise<void> {
  if (Platform.OS === 'web' || events.length === 0) return;
  const granted = await ensureReminderPermissions();
  if (!granted) return;
  for (const event of events) {
    await scheduleRemindersForEvent(event);
  }
}
