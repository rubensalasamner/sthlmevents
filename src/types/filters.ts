import type { EventCategory } from '@/types/event';

export type CategoryFilterValue = EventCategory | 'all';

/** `null` = any distance (sort only). */
export type NearRadiusKm = null | 2 | 5;
