import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EventCategory } from '@/types/event';

/**
 * Consumer-facing interest chips — a curated subset of EventCategory so the
 * sheet stays scannable (8 vibes, not every taxonomy leaf).
 */
export const INTEREST_CATEGORIES = [
  'music',
  'nightlife',
  'food',
  'art',
  'theatre',
  'comedy',
  'market',
  'family',
] as const satisfies readonly EventCategory[];

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

export type InterestsSnapshot = {
  categories: InterestCategory[];
  onboarding: OnboardingStatus;
  /** Distinct event-detail opens that count toward the progressive prompt. */
  eventOpenCount: number;
  /** Times the user added a favourite (not removals). */
  favoriteAdds: number;
};

const STORAGE_KEY = 'sthlmevents.interests.v1';

export const EMPTY_INTERESTS: InterestsSnapshot = {
  categories: [],
  onboarding: 'pending',
  eventOpenCount: 0,
  favoriteAdds: 0,
};

const INTEREST_SET = new Set<string>(INTEREST_CATEGORIES);

function isInterestCategory(value: unknown): value is InterestCategory {
  return typeof value === 'string' && INTEREST_SET.has(value);
}

export function parseInterestsSnapshot(raw: string | null): InterestsSnapshot {
  if (!raw) return { ...EMPTY_INTERESTS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_INTERESTS };
    const record = parsed as Record<string, unknown>;
    const categories = Array.isArray(record.categories)
      ? record.categories.filter(isInterestCategory)
      : [];
    const onboarding =
      record.onboarding === 'completed' || record.onboarding === 'skipped'
        ? record.onboarding
        : 'pending';
    const eventOpenCount =
      typeof record.eventOpenCount === 'number' && record.eventOpenCount >= 0
        ? Math.floor(record.eventOpenCount)
        : 0;
    const favoriteAdds =
      typeof record.favoriteAdds === 'number' && record.favoriteAdds >= 0
        ? Math.floor(record.favoriteAdds)
        : 0;
    return { categories, onboarding, eventOpenCount, favoriteAdds };
  } catch {
    return { ...EMPTY_INTERESTS };
  }
}

/**
 * Progressive prompt gate: after real engagement, not on cold start.
 * 1 favourite add OR 3 event opens — then offer the chip sheet once.
 */
export function shouldOfferInterestsPrompt(snapshot: InterestsSnapshot): boolean {
  if (snapshot.onboarding !== 'pending') return false;
  return snapshot.favoriteAdds >= 1 || snapshot.eventOpenCount >= 3;
}

export async function loadInterestsSnapshot(): Promise<InterestsSnapshot> {
  try {
    return parseInterestsSnapshot(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...EMPTY_INTERESTS };
  }
}

export async function saveInterestsSnapshot(snapshot: InterestsSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
