/**
 * Raw row shape for Evenemangskollen's events table. The documented public API
 * (`/api/v1`, x-api-key) currently answers 503 from its CDN, while the site's
 * own frontend talks straight to a Supabase PostgREST endpoint using the site's
 * public anon key — this is that contract (columns of the `events` table the
 * pipeline consumes; `select=*` returns more).
 */

export type EkRow = {
  id: string;
  name: string;
  description_markdown?: string | null;
  description_html?: string | null;
  /** ISO 8601 instant with +00:00 offset. */
  start_utc: string;
  end_utc?: string | null;
  /** Ticketing state: releasedForSale | onsale | notReleased | salePaused | saleEnded | offsale | cancelled … */
  state?: string | null;
  stock_level?: number | null;
  info_url?: string | null;
  shop_url?: string | null;
  image_url?: string | null;
  event_hierarchy_type?: string | null;
  organizer_name?: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_address?: string | null;
  labels?: string[];
  tags?: string[];
  is_popular?: boolean | null;
  updated_at?: string | null;
};
