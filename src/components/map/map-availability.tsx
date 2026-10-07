import Constants from 'expo-constants';
import { requireNativeModule } from 'expo-modules-core';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

let nativeMapsChecked = false;
let nativeMapsAvailable = false;

/**
 * Expo Go ships no native maps module; built apps do. This gate exists so the
 * map screen degrades gracefully in Expo Go instead of crashing.
 */
export function hasNativeMaps(): boolean {
  if (!nativeMapsChecked) {
    nativeMapsChecked = true;
    try {
      requireNativeModule('ExpoMaps');
      nativeMapsAvailable = true;
    } catch {
      nativeMapsAvailable = false;
    }
  }
  return nativeMapsAvailable;
}

/**
 * Without a Google Maps key in the embedded manifest, mounting GoogleMaps.View
 * crashes natively. Expo strips the key from JS-visible config, so we read the
 * `extra.mapsConfigured` flag baked in at build time.
 */
export function hasMapsApiKey(): boolean {
  return Constants.expoConfig?.extra?.mapsConfigured === true;
}

export function MapUnavailable({ title = 'Map unavailable' }: { title?: string }) {
  return (
    <ThemedView style={styles.unavailable}>
      <ThemedText type="section">{title}</ThemedText>
      <ThemedText type="meta" themeColor="textSecondary" style={styles.unavailableText}>
        {title === 'Map not configured'
          ? 'The maps API key is missing in this build. Everything else works — browse events from Home.'
          : 'Maps can’t run inside Expo Go. Everything else works — browse events from Home.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  unavailableText: {
    textAlign: 'center',
  },
});
