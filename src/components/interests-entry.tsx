import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useInterests } from '@/context/interests-context';
import { Spacing } from '@/constants/theme';

/**
 * Tiny Discover entry to the interests sheet — lives on the section title row
 * so it doesn't add another filter strip between search and the feed.
 */
export function InterestsEntry() {
  const { categories, onboarding, hydrated, openEditor } = useInterests();

  if (!hydrated) return null;
  if (onboarding === 'pending' && categories.size === 0) return null;

  const label = categories.size === 0 ? 'Vibes' : `Vibes · ${categories.size}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit your vibes"
      hitSlop={Spacing.two}
      onPress={openEditor}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <ThemedText type="small" themeColor="accent">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
