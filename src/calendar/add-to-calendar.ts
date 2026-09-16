import { Linking, Platform } from 'react-native';

import {
  STOCKHOLM_TZ,
  calendarEndDate,
  calendarLocation,
  calendarNotes,
  googleCalendarUrl,
} from '@/calendar/calendar-fields';
import type { StockholmEvent } from '@/types/event';

export type AddToCalendarResult =
  | { status: 'saved' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'denied' }
  | { status: 'error'; message: string };

export {
  calendarEndDate,
  calendarLocation,
  calendarNotes,
  googleCalendarUrl,
} from '@/calendar/calendar-fields';

/**
 * Opens the OS "create event" sheet pre-filled with this event (native), or
 * Google Calendar (web). Permission is requested only where the OS requires it
 * (iOS); Android's system UI does not need calendar permissions.
 */
export async function addEventToCalendar(event: StockholmEvent): Promise<AddToCalendarResult> {
  if (Platform.OS === 'web') {
    const opened = await Linking.openURL(googleCalendarUrl(event));
    return opened ? { status: 'saved' } : { status: 'cancelled' };
  }

  try {
    const Calendar = await import('expo-calendar/legacy');
    const available = await Calendar.isAvailableAsync();
    if (!available) return { status: 'unavailable' };

    if (Platform.OS === 'ios') {
      const current = await Calendar.getCalendarPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const requested = await Calendar.requestCalendarPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return { status: 'denied' };
    }

    const result = await Calendar.createEventInCalendarAsync({
      title: event.title,
      startDate: new Date(event.startsAt),
      endDate: calendarEndDate(event),
      location: calendarLocation(event) || undefined,
      notes: calendarNotes(event) || undefined,
      timeZone: STOCKHOLM_TZ,
      endTimeZone: STOCKHOLM_TZ,
    });

    // `canceled` / `deleted` / `done` / `saved` depending on platform/OS version.
    const action = String(result.action ?? '').toLowerCase();
    if (action.includes('cancel') || action.includes('dismiss')) {
      return { status: 'cancelled' };
    }
    return { status: 'saved' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', message };
  }
}
