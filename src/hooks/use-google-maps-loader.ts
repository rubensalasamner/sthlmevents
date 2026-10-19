import { useEffect, useState } from 'react';

const LOAD_CALLBACK_BASE = 'sthlmeventsGoogleMapsReady';

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
        Marker: new (options: Record<string, unknown>) => unknown;
      };
    };
  }
}

type MapsApi = NonNullable<Window['google']>['maps'];

let pending: Promise<MapsApi> | null = null;

function loadGoogleMaps(apiKey: string): Promise<MapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const callbackName = `${LOAD_CALLBACK_BASE}_${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps failed to initialize'));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      pending = null;
      reject(new Error('Failed to load Google Maps for web'));
    };
    document.head.appendChild(script);
  });
  return pending;
}

/** Loads the Google Maps JS API once per page for the given browser key. */
export function useGoogleMapsLoader(apiKey: string | undefined) {
  const [maps, setMaps] = useState<MapsApi | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      const timeout = setTimeout(() => setFailed(true), 0);
      return () => clearTimeout(timeout);
    }
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((loaded) => {
        if (!cancelled) setMaps(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { maps, failed };
}
