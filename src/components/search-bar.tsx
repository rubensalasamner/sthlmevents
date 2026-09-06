import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Search events' }: SearchBarProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <SymbolView name="magnifyingglass" size={18} tintColor={theme.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[styles.input, { color: theme.text }]}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={Spacing.two}
          onPress={() => onChange('')}
          style={({ pressed }) => pressed && styles.pressed}>
          <SymbolView name="xmark.circle.fill" size={18} tintColor={theme.textSecondary} />
        </Pressable>
      )}
      <View />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginHorizontal: Spacing.four,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
