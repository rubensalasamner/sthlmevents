import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { GeoPoint } from '@/utils/geo';

export type UserLocationState = {
  location: GeoPoint | null;
  /** True while a permission/position request is in flight. */
  loading: boolean;
  /** Set when the user denied permission or GPS failed. */
  error: 'denied' | 'unavailable' | 'error' | null;
  /** Request permission (if needed) and refresh the position. */
  refresh: () => void;
};

/** Reuse a fix for this long so toggling Near me doesn't re-block on GPS. */
const LOCATION_TTL_MS = 5 * 60 * 1000;

/**
 * Lazy user location: does nothing until `enabled` is true (first Near me tap),
 * so Discover doesn't prompt for GPS on cold start. Cached fixes survive
 * disable/enable so the UI stays snappy.
 */
export function useUserLocation(enabled: boolean): UserLocationState {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UserLocationState['error']>(null);
  const [token, setToken] = useState(0);
  const cachedAtRef = useRef(0);

  const refresh = useCallback(() => {
    cachedAtRef.current = 0;
    setToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Always clear the spinner when Near me turns off — otherwise a cancelled
      // in-flight GPS request leaves `loading` stuck true (no finally runs).
      setLoading(false);
      if (Platform.OS === 'web') return;
      return;
    }

    if (Platform.OS === 'web') {
      setError('unavailable');
      setLoading(false);
      return;
    }

    const cacheAge = Date.now() - cachedAtRef.current;
    if (location && cacheAge > 0 && cacheAge < LOCATION_TTL_MS) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const Location = await import('expo-location');
        const current = await Location.getForegroundPermissionsAsync();
        let status = current.status;
        if (status !== 'granted') {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }
        if (cancelled) return;
        if (status !== 'granted') {
          setError('denied');
          setLocation(null);
          cachedAtRef.current = 0;
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        cachedAtRef.current = Date.now();
      } catch {
        if (!cancelled) {
          setError('error');
          setLocation(null);
          cachedAtRef.current = 0;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // token bumps force a fresh GPS read; location intentionally omitted so a
    // cached fix doesn't re-trigger the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token]);

  return { location, loading, error, refresh };
}
