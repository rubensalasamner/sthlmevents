import type { SourceAdapter } from './source-adapter.js';
import { AlleventsAdapter } from './allevents/adapter.js';
import { BiblioteketAdapter } from './biblioteket/adapter.js';
import { EvenemangskollenAdapter } from './evenemangskollen/adapter.js';
import { EventbriteAdapter } from './eventbrite/adapter.js';
import { KulturhusetAdapter } from './kulturhuset/adapter.js';
import { KulturbiljetterAdapter } from './kulturbiljetter/adapter.js';
import { LoppiskartanAdapter } from './loppiskartan/adapter.js';
import { LumaAdapter } from './luma/adapter.js';
import { MeetupAdapter } from './meetup/adapter.js';
import { ResidentAdvisorAdapter } from './resident-advisor/adapter.js';
import { TicketmasterAdapter } from './ticketmaster/adapter.js';
import { VisitStockholmAdapter } from './visit-stockholm/adapter.js';

/** Registry of available source adapters, keyed by id. */
export const SOURCE_ADAPTERS: Record<string, SourceAdapter> = {
  'visit-stockholm': new VisitStockholmAdapter(),
  loppiskartan: new LoppiskartanAdapter(),
  eventbrite: new EventbriteAdapter(),
  'resident-advisor': new ResidentAdvisorAdapter(),
  ticketmaster: new TicketmasterAdapter(),
  luma: new LumaAdapter(),
  meetup: new MeetupAdapter(),
  allevents: new AlleventsAdapter(),
  evenemangskollen: new EvenemangskollenAdapter(),
  biblioteket: new BiblioteketAdapter(),
  kulturhuset: new KulturhusetAdapter(),
  kulturbiljetter: new KulturbiljetterAdapter(),
};

export function allAdapters(): SourceAdapter[] {
  return Object.values(SOURCE_ADAPTERS);
}

export function getAdapter(id: string): SourceAdapter {
  const adapter = SOURCE_ADAPTERS[id];
  if (!adapter) {
    const known = Object.keys(SOURCE_ADAPTERS).join(', ');
    throw new Error(`Unknown source "${id}". Known sources: ${known}`);
  }
  return adapter;
}
