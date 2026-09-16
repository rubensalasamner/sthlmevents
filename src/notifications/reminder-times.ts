import { stockholmLocalDateTime } from '@/utils/date-range';

/**
 * When to fire local reminders for a favourited event.
 *
 * Two triggers (both optional — skipped if already past):
 *  1. Day-before morning — 09:00 Stockholm on the calendar day before start
 *  2. Hours-before — 2h before `startsAt`
 *
 * Pure / timezone-aware so tests don't need the notifications native module.
 */
export type ReminderKind = 'day-before' | 'hours-before';

export type ReminderFire = {
  kind: ReminderKind;
  at: Date;
};

const HOURS_BEFORE_MS = 2 * 60 * 60 * 1000;
/** Minimum lead time: don't schedule a reminder that would fire in < 60s. */
const MIN_LEAD_MS = 60_000;

/**
 * Returns the fire times that should still be scheduled for `startsAt`,
 * relative to `now`. Empty when the event has already started or both
 * windows have passed.
 */
export function reminderFireTimes(startsAt: string, now: Date = new Date()): ReminderFire[] {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime() + MIN_LEAD_MS) {
    return [];
  }

  const fires: ReminderFire[] = [];

  // Day-before 09:00 Stockholm, relative to the event's start day.
  const dayBeforeMorning = stockholmLocalDateTime(-1, 9, 0, start);
  if (dayBeforeMorning.getTime() > now.getTime() + MIN_LEAD_MS) {
    fires.push({ kind: 'day-before', at: dayBeforeMorning });
  }

  const hoursBefore = new Date(start.getTime() - HOURS_BEFORE_MS);
  if (hoursBefore.getTime() > now.getTime() + MIN_LEAD_MS) {
    fires.push({ kind: 'hours-before', at: hoursBefore });
  }

  return fires;
}

/** Deterministic notification id so cancel doesn't need a side store. */
export function reminderNotificationId(eventId: string, kind: ReminderKind): string {
  return `fav-reminder:${kind}:${eventId}`;
}
