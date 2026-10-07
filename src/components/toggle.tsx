import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToggleProps = {
  label: string;
  description?: string | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Row switch used by the filter sheet (Near me, etc.). */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.copy}>
        <ThemedText type="card">{label}</ThemedText>
        {description ? (
          <ThemedText type="meta" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: checked ? theme.accent : theme.backgroundSelected },
        ]}>
        <View
          style={[
            styles.knob,
            {
              backgroundColor: checked ? theme.accentInk : theme.textSecondary,
              alignSelf: checked ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
