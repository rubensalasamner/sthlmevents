import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type FollowChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

/** Compact follow toggle for venue / organizer on the event detail. */
export function FollowChip({ label, active, onPress }: FollowChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `Unfollow ${label}` : `Follow ${label}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={active ? 'accent' : 'backgroundSelected'} style={styles.chip}>
        <ThemedText type="metaBold" themeColor={active ? 'accentInk' : 'text'} numberOfLines={1}>
          {active ? `Following · ${label}` : `Follow ${label}`}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
    borderRadius: Spacing.five,
    maxWidth: 280,
  },
  pressed: {
    opacity: 0.7,
  },
});
