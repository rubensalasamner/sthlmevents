/**
 * Single bridge to the app's canonical event model so the pipeline and the
 * React Native app share exactly one definition of an event.
 */
export type { StockholmEvent, EventCategory, EventVenue } from '../../../src/types/event';
export { EVENT_CATEGORIES } from '../../../src/types/event';
