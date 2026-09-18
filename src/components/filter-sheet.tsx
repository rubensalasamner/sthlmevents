import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter } from '@/components/category-filter';
import { DateFilter } from '@/components/date-filter';
import { NearMeFilter } from '@/components/near-me-filter';
import { SourceFilter } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import type { StockholmEvent } from '@/types/event';

type FilterSheetProps = {
  events: readonly StockholmEvent[];
  visible: boolean;
  onClose: () => void;
  nearStatus?: string | null;
};

/** Date, category, near-me (and dev source) in one sheet — not four always-on rows. */
export function FilterSheet({ events, visible, onClose, nearStatus }: FilterSheetProps) {
  const {
    category,
    dateRange,
    source,
    nearMe,
    nearRadiusKm,
    setCategory,
    setDateRange,
    setSource,
    setNearMe,
    setNearRadiusKm,
    reset,
    devSourcesUnlocked,
    toggleDevSources,
  } = useFilters();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Filters
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                onPress={reset}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="small" themeColor="textSecondary">
                  Reset
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="smallBold" themeColor="accent">
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
          <DateFilter value={dateRange} onChange={setDateRange} />
          <CategoryFilter value={category} onChange={setCategory} />
          <NearMeFilter
            enabled={nearMe}
            onEnabledChange={setNearMe}
            radiusKm={nearRadiusKm}
            onRadiusChange={setNearRadiusKm}
            statusLabel={nearStatus}
          />
          <Pressable onLongPress={toggleDevSources} delayLongPress={800}>
            <SourceFilter
              events={events}
              value={source}
              onChange={setSource}
              unlocked={devSourcesUnlocked}
            />
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
