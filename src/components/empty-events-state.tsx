import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';

type EmptyEventsStateProps = {
  message: string;
  /** Offer Reset when filters may be the reason the list is empty. */
  showReset?: boolean;
  showExplore?: boolean;
};

/** Shared recovery UI for empty magazine / agenda / saved lists. */
export function EmptyEventsState({
  message,
  showReset = false,
  showExplore = false,
}: EmptyEventsStateProps) {
  const { isActive, reset } = useFilters();
  const router = useRouter();
  const canReset = showReset && isActive;

  return (
    <View style={styles.wrap}>
      <ThemedText type="meta" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {canReset || showExplore ? (
        <View style={styles.actions}>
          {canReset ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              onPress={reset}
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="link">Reset filters</ThemedText>
            </Pressable>
          ) : null}
          {showExplore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Explore map"
              onPress={() => router.push('/(tabs)/map' as Href)}
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="link">Open Explore</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
