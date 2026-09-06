import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
};

export function SearchBar({
  value,
  onChange,
  placeholder = 'What are you looking for?',
  filtersOpen = false,
  onToggleFilters,
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedView type="backgroundElement" style={styles.container}>
        <Icon sf="magnifyingglass" material="search" size={18} color={theme.textSecondary} />
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
            <Icon sf="xmark.circle.fill" material="close" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </ThemedView>

      {onToggleFilters && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
          onPress={onToggleFilters}
          style={({ pressed }) => [styles.filterButtonWrap, pressed && styles.pressed]}>
          <ThemedView
            type={filtersOpen ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.filterButton}>
            <Icon
              sf={filtersOpen ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle'}
              material="tune"
              size={20}
              color={theme.text}
            />
          </ThemedView>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Spacing.five,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  filterButtonWrap: {
    borderRadius: Spacing.five,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
