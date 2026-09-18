import * as Linking from 'expo-linking';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { directionsUrl, type DirectionsOs } from '@/utils/directions';

type DirectionsButtonProps = {
  event: StockholmEvent;
};

export function DirectionsButton({ event }: DirectionsButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Directions"
      onPress={() => {
        const os: DirectionsOs =
          Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
            ? Platform.OS
            : 'web';
        const url = directionsUrl(event, os);
        if (url) void Linking.openURL(url);
      }}
      style={({ pressed }) => [styles.flex, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.button}>
        <Icon sf="map" material="location_on" size={18} color={theme.text} />
        <ThemedText type="smallBold">Directions</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
