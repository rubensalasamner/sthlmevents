/**
 * Raw shapes for Kulturhuset Stadsteatern's calendar backend: an Elasticsearch
 * index (`khst-events`) exposed at `https://elastic.kulturhusetstadsteatern.se`
 * — discovered in the site's `drupalSettings` (`elasticSearchUrl`) and used by
 * the Vue calendar filter. `_search` is open; meta endpoints (mapping/count)
 * are 403.
 *
 * Two entity families coexist per document: `drupal*` (CMS content: title,
 * page link, categories, hero image, lead text, locations) and `tix*`
 * (ticketing: canonical times, prices, sale status, ticket link, venue/hall).
 * Only the fields the pipeline consumes are typed.
 */

export type KhsTerm = {
  id: string | number;
  label: string;
};

export type KhsTextValue = {
  value: string;
};

export type KhsImage = {
  id: string | number;
  src: string;
};

export type KhsEventSource = {
  drupalId: number;
  drupalTitle: string;
  drupalLink: string;
  hidePriceInfo?: boolean;
  drupalCategory?: KhsTerm[];
  drupalHeroImage?: KhsImage[];
  drupalLeadText?: KhsTextValue[];
  drupalLocation?: KhsTerm[];
  tixEventId: number;
  tixEventGroupId?: number;
  tixName: string;
  /** ISO 8601 with explicit Stockholm offset, e.g. "2026-08-28T19:30:00+02:00". */
  tixStartDate: string;
  tixEndDate?: string;
  tixDuration?: string;
  tixMinPrice?: number | null;
  tixMaxPrice?: number | null;
  tixTicketLink?: string;
  tixSaleStatusId?: number;
  tixHall?: KhsTerm[];
  tixVenue?: KhsTerm[];
};

export type KhsHit = {
  _id: string;
  _source: KhsEventSource;
};

export type KhsSearchResponse = {
  hits: {
    total: { value: number; relation: string };
    hits: KhsHit[];
  };
};

export type KhsSortOrder = 'asc' | 'desc';
