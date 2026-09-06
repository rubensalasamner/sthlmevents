/**
 * Parsed row from loppiskartan.se/loppiskalender. The calendar is dated,
 * one-off flea-market listings (bakluckeloppis, marknader, engångsloppisar).
 */
export type LoppisRow = {
  /** Path to the market detail page, e.g. "/markets/dalendagen-2026". */
  path: string;
  /** ISO date (YYYY-MM-DD) from the row's <time dateTime>. */
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  /** Municipality, e.g. "Stockholm", "Botkyrka". */
  city: string;
  /** County, e.g. "Stockholms län". */
  region: string;
};
