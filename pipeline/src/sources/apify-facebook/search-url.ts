/**
 * Builds Facebook Events search URLs with an embedded date-range filter, so
 * the actor only returns (and only charges for) events inside the window.
 *
 * Encoding VERIFIED against the actor's input-schema example (build 0.0.83):
 * `filters` is base64(JSON) where keys are "<filterName>:<index>" and values
 * are JSON strings like {"name":"filter_events_date","args":"2026-09-15~2026-12-14"}.
 * What is NOT yet verified: whether Facebook honours `filters` without the
 * session `sde` param the example carried. One probe/GUI run confirms or
 * kills this — do not wire into the adapter before that run.
 */
export function facebookEventsSearchUrl(
  query: string,
  range: { from: string; to: string },
): string {
  const filters = {
    'filter_events_date_range:0': JSON.stringify({
      name: 'filter_events_date',
      args: `${range.from}~${range.to}`,
    }),
  };
  const encoded = Buffer.from(JSON.stringify(filters), 'utf8').toString('base64');
  return `https://www.facebook.com/events/search/?q=${encodeURIComponent(query)}&filters=${encodeURIComponent(encoded)}`;
}
