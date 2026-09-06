/**
 * Timezone helpers for sources that publish wall-clock local dates/times
 * (Visit Stockholm gives `start_date` + optional `start_time` in local time).
 * We convert to a correct UTC ISO instant, accounting for Stockholm DST,
 * without pulling in a timezone dependency.
 */

const STOCKHOLM_TZ = 'Europe/Stockholm';

/** Minutes east of UTC for Europe/Stockholm at the given instant (e.g. 120 in summer). */
export function stockholmOffsetMinutes(instant: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: STOCKHOLM_TZ,
    timeZoneName: 'shortOffset',
  });
  const tzName =
    formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ??
    'GMT+0';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes);
}

/**
 * Converts a Stockholm-local `YYYY-MM-DD` (+ optional `HH:mm`) into a UTC ISO
 * string. Missing time is treated as midnight local.
 */
/** The calendar date (YYYY-MM-DD) an instant falls on in Europe/Stockholm. */
export function stockholmLocalDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STOCKHOLM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function stockholmLocalToUtcIso(dateStr: string, timeStr?: string | null): string {
  const [yearPart, monthPart, dayPart] = dateStr.split('-');
  const [hourPart, minutePart] = (timeStr ?? '00:00').split(':');

  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offsetMinutes = stockholmOffsetMinutes(new Date(naiveUtcMs));
  return new Date(naiveUtcMs - offsetMinutes * 60_000).toISOString();
}
