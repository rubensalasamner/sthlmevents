import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type CategoryPillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryPill({ label, selected = false, onPress }: CategoryPillProps) {
  const content = (
    <ThemedView
      type={selected ? 'backgroundSelected' : 'backgroundElement'}
      style={styles.pill}>
      <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </ThemedView>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
