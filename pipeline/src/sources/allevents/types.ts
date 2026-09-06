/**
 * Raw shapes for allevents.in city pages. The listing hydrates a JS array
 * `_this.events_data = [ ... ]` inline in the HTML; only the fields the pipeline
 * consumes are typed. Times are unix epoch seconds (absolute instants, so no
 * timezone handling is needed); coordinates ship as strings.
 */

export type AeVenue = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  full_address?: string;
};

export type AeOrganizer = {
  org_id?: string;
  name?: string;
};

export type AeTickets = {
  has_tickets?: boolean;
  ticket_url?: string;
};

export type AeEvent = {
  event_id: string;
  eventname: string;
  eventname_raw?: string;
  /** Unix epoch seconds (string). */
  start_time?: string;
  /** Unix epoch seconds (string). */
  end_time?: string;
  location?: string;
  venue?: AeVenue;
  event_url: string;
  share_url?: string;
  banner_url?: string;
  thumb_url_large?: string;
  thumb_url?: string;
  organizer?: AeOrganizer;
  categories?: string[];
  tickets?: AeTickets;
  short_description?: string;
  timezone?: string;
  custom_params?: {
    merged_lookup?: string[];
  };
};
