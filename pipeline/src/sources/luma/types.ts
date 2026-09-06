/**
 * Raw shapes for the Luma (lu.ma) discovery city page. Luma server-renders the
 * place's upcoming events into `__NEXT_DATA__`, at
 * `props.pageProps.initialData.data.events`. Only the fields the pipeline
 * consumes are typed. Times are already UTC ISO instants; coordinates are
 * present even when the street address is obfuscated to guests-only.
 */

export type LumaCoordinate = {
  latitude: number;
  longitude: number;
};

export type LumaGeoAddressInfo = {
  mode?: string;
  city?: string | null;
  city_state?: string | null;
  sublocality?: string | null;
  country?: string | null;
  country_code?: string | null;
  region?: string | null;
  /** Present only when the host makes the address public. */
  address?: string | null;
  full_address?: string | null;
  place_name?: string | null;
};

export type LumaTicketInfo = {
  price?: unknown;
  is_free?: boolean;
  max_price?: unknown;
};

export type LumaHost = {
  name?: string;
};

export type LumaEvent = {
  api_id: string;
  name: string;
  /** UTC ISO instant. */
  start_at: string;
  /** UTC ISO instant. */
  end_at?: string | null;
  cover_url?: string;
  /** Short slug; the public page is `https://lu.ma/<url>`. */
  url?: string;
  /** `offline` | `online`. */
  location_type?: string;
  timezone?: string;
  coordinate?: LumaCoordinate | null;
  geo_address_info?: LumaGeoAddressInfo | null;
};

export type LumaEntry = {
  api_id: string;
  event: LumaEvent;
  ticket_info?: LumaTicketInfo | null;
  hosts?: LumaHost[];
};

export type LumaNextData = {
  props?: {
    pageProps?: {
      initialData?: {
        data?: {
          events?: LumaEntry[];
        };
      };
    };
  };
};
