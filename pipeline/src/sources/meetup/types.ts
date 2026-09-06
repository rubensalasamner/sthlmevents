/**
 * Raw shapes for Meetup's Stockholm find page
 * (`/find/se--stockholm/`). The page server-renders several event buckets
 * into `__NEXT_DATA__` at `props.pageProps`; events may appear in more than
 * one bucket, so callers merge by `id`. Only the fields the pipeline consumes
 * are typed. `dateTime`/`endTime` are ISO instants with a UTC offset; venues
 * carry name/address but no coordinates (the geocoding stage resolves those).
 */

export type MeetupPhoto = {
  id?: string;
  baseUrl?: string;
  highResUrl?: string;
};

export type MeetupVenue = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type MeetupGroup = {
  id?: string;
  name?: string;
  urlname?: string;
  timezone?: string;
};

export type MeetupFeeSettings = {
  fee?: {
    amount?: number;
    currency?: string;
  };
};

export type MeetupEvent = {
  __typename?: 'Event';
  id: string;
  title: string;
  eventUrl?: string;
  /** `PHYSICAL` | `ONLINE`. */
  eventType?: string;
  /** ISO instant with UTC offset. */
  dateTime?: string;
  endTime?: string;
  featuredEventPhoto?: MeetupPhoto | null;
  displayPhoto?: MeetupPhoto | null;
  isOnline?: boolean;
  feeSettings?: MeetupFeeSettings | null;
  group?: MeetupGroup | null;
  venue?: MeetupVenue | null;
};

export type MeetupNextData = {
  props?: {
    pageProps?: {
      /** Bucket name -> array of events (or `{ data: [...] }`-shaped edges). */
      [bucket: string]: unknown;
    };
  };
};

/** Buckets the find page fills with events; values overlap between buckets. */
export const EVENT_BUCKETS = [
  'eventsInLocation',
  'todayEvents',
  'thisWeekendEvents',
  'topicalEventsMusic',
  'topicalEventsSocial',
  'topicalEventsOutdoor',
  'topicalEventsSports',
] as const;
