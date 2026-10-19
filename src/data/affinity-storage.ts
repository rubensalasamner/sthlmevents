import AsyncStorage from '@react-native-async-storage/async-storage';

/** Weighted engagement / follow signals used for on-device feed personalization. */
export type AffinitySignalKind = 'open' | 'favorite' | 'follow_venue' | 'follow_organizer';

export type AffinitySignal = {
  kind: AffinitySignalKind;
  /** Category id, or folded venue/organizer name. */
  key: string;
  at: number;
};

export type AffinitySnapshot = {
  signals: AffinitySignal[];
  followedVenues: string[];
  followedOrganizers: string[];
};

const STORAGE_KEY = 'sthlmevents.affinity.v1';
/** Cap stored signals so AsyncStorage stays small; oldest drop first. */
export const MAX_AFFINITY_SIGNALS = 200;

export const EMPTY_AFFINITY: AffinitySnapshot = {
  signals: [],
  followedVenues: [],
  followedOrganizers: [],
};

const KINDS = new Set<AffinitySignalKind>([
  'open',
  'favorite',
  'follow_venue',
  'follow_organizer',
]);

function isSignal(value: unknown): value is AffinitySignal {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.kind === 'string' &&
    KINDS.has(record.kind as AffinitySignalKind) &&
    typeof record.key === 'string' &&
    record.key.length > 0 &&
    typeof record.at === 'number' &&
    Number.isFinite(record.at)
  );
}

export function parseAffinitySnapshot(raw: string | null): AffinitySnapshot {
  if (!raw) return { ...EMPTY_AFFINITY, signals: [], followedVenues: [], followedOrganizers: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...EMPTY_AFFINITY, signals: [], followedVenues: [], followedOrganizers: [] };
    }
    const record = parsed as Record<string, unknown>;
    const signals = Array.isArray(record.signals)
      ? record.signals.filter(isSignal).slice(-MAX_AFFINITY_SIGNALS)
      : [];
    const followedVenues = Array.isArray(record.followedVenues)
      ? record.followedVenues.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
    const followedOrganizers = Array.isArray(record.followedOrganizers)
      ? record.followedOrganizers.filter((v): v is string => typeof v === 'string' && v.length > 0)
      : [];
    return { signals, followedVenues, followedOrganizers };
  } catch {
    return { ...EMPTY_AFFINITY, signals: [], followedVenues: [], followedOrganizers: [] };
  }
}

export async function loadAffinitySnapshot(): Promise<AffinitySnapshot> {
  try {
    return parseAffinitySnapshot(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...EMPTY_AFFINITY, signals: [], followedVenues: [], followedOrganizers: [] };
  }
}

export async function saveAffinitySnapshot(snapshot: AffinitySnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

/** Append a signal and trim; follow kinds also update the follow lists. */
export function appendAffinitySignal(
  snapshot: AffinitySnapshot,
  signal: AffinitySignal,
): AffinitySnapshot {
  const signals = [...snapshot.signals, signal].slice(-MAX_AFFINITY_SIGNALS);
  if (signal.kind === 'follow_venue') {
    const followedVenues = snapshot.followedVenues.includes(signal.key)
      ? snapshot.followedVenues
      : [...snapshot.followedVenues, signal.key];
    return { ...snapshot, signals, followedVenues };
  }
  if (signal.kind === 'follow_organizer') {
    const followedOrganizers = snapshot.followedOrganizers.includes(signal.key)
      ? snapshot.followedOrganizers
      : [...snapshot.followedOrganizers, signal.key];
    return { ...snapshot, signals, followedOrganizers };
  }
  return { ...snapshot, signals };
}

export function unfollowVenue(snapshot: AffinitySnapshot, key: string): AffinitySnapshot {
  return {
    ...snapshot,
    followedVenues: snapshot.followedVenues.filter((v) => v !== key),
  };
}

export function unfollowOrganizer(snapshot: AffinitySnapshot, key: string): AffinitySnapshot {
  return {
    ...snapshot,
    followedOrganizers: snapshot.followedOrganizers.filter((v) => v !== key),
  };
}
