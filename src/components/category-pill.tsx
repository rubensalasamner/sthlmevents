import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CategoryPillProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Selectable chip — filter sheet, interests, and source filter. */
export function CategoryPill({ label, selected = false, onPress }: CategoryPillProps) {
  const theme = useTheme();

  const content = (
    <ThemedView
      style={[
        styles.pill,
        { backgroundColor: selected ? theme.accent : theme.backgroundElement },
      ]}>
      <ThemedText type="metaBold" themeColor={selected ? 'accentInk' : 'text'}>
        {label}
      </ThemedText>
    </ThemedView>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
