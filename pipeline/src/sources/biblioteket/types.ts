/**
 * Raw shapes for Stockholms stadsbibliotek's GraphQL API
 * (`https://biblioteket.stockholm.se/graphql`, the site's own Apollo Server —
 * introspection is disabled, so this mirrors the exact `eventSearch` query the
 * website's bundle issues). Only the fields the pipeline consumes are typed.
 *
 * Quirk: `dateTime` dates arrive as Swedish long-form strings
 * ("onsdag 2 september 2026") and times as "HH:mm"; parsing to ISO lives in
 * the mapper, not here.
 */

export type BibDateTime = {
  startDate: string;
  stopDate: string;
  startTime?: string | null;
  stopTime?: string | null;
};

export type BibEventImage = {
  url?: string | null;
};

export type BibEvent = {
  id: number;
  title: string;
  eventSlugId: string;
  description?: {
    preamble?: string | null;
  } | null;
  image?: BibEventImage | null;
  location?: string | null;
  library?: string | null;
  externalEventLink?: string | null;
  dateTime: BibDateTime;
  targetAudiences?: string[];
};

export type BibEventSearch = {
  /** Total matching events server-side (capped, observed at 2000). */
  results: number;
  events: BibEvent[];
};

export type BibResponse = {
  data?: {
    eventSearch?: BibEventSearch;
  };
  errors?: { message: string }[];
};

export type BibSearchVariables = {
  query: string;
  size: number;
  from: number;
  startDate?: string;
  stopDate?: string;
  isSchoolEvent: boolean;
};
