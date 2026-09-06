/**
 * Raw response types for the Visit Stockholm "SBR Public API" (v1.35.8).
 * Mirrors https://api.visitstockholm.com/api/public-v1/public_schema.yaml
 * Only the fields the pipeline consumes are typed.
 */

export type VsLocalized = {
  en?: string;
  sv?: string;
};

export type VsLocation = {
  latitude: number;
  longitude: number;
};

export type VsSubcategory = {
  title: string;
  slug: string;
};

export type VsCategory = {
  title: string;
  slug: string;
  subcategories?: VsSubcategory[];
};

export type VsScheduleDate = {
  date: string;
};

export type VsSchedule = {
  range?: {
    start: string;
    end: string;
    excluded?: string[];
  };
  dates?: VsScheduleDate[];
};

export type VsEvent = {
  id: string;
  title: VsLocalized;
  description: VsLocalized;
  external_website_url: string;
  /** Slug of the event page on visitstockholm.com. */
  url: string;
  address: string | null;
  venue_name: string | null;
  zip_code: string | null;
  city: string | null;
  location: VsLocation | null;
  created_at: string;
  modified_at: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  categories: VsCategory[];
  schedule?: VsSchedule;
  closest_station?: string;
};

export type VsEventsResponse = {
  count: number;
  /** Next page number (not a URL), or null on the last page. */
  next: number | null;
  /** Previous page number, or null on the first page. */
  previous: number | null;
  results: VsEvent[];
  total_pages?: number;
  current_page?: number;
};
