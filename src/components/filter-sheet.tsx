import { type ReactNode, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { SourceFilter } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useTheme } from '@/hooks/use-theme';
import type { NearRadiusKm } from '@/components/near-me-filter';
import { EVENT_CATEGORIES, type EventCategory, type StockholmEvent } from '@/types/event';
import { dateRangeHeading, dateRangeHint, type DateRangeValue } from '@/utils/date-range';
import { formatCategory } from '@/utils/format';

type FilterSheetProps = {
  events: readonly StockholmEvent[];
  visible: boolean;
  onClose: () => void;
  nearStatus?: string | null;
  resultCount?: number;
};

const DATE_ORDER: readonly DateRangeValue[] = ['today', 'weekend', 'week', 'all'];

const RADIUS: readonly { value: NearRadiusKm; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="metaBold" themeColor="textSecondary" style={styles.sectionLabel}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.choiceChip,
          { backgroundColor: selected ? theme.accent : theme.backgroundElement },
        ]}>
        <ThemedText type="metaBold" themeColor={selected ? 'accentInk' : 'text'}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function FilterSheet({
  events,
  visible,
  onClose,
  nearStatus,
  resultCount,
}: FilterSheetProps) {
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
    isActive,
    devSourcesUnlocked,
    toggleDevSources,
  } = useFilters();
  const theme = useTheme();
  const { height } = useWindowDimensions();

  const cta = useMemo(() => {
    if (typeof resultCount !== 'number') return 'Show events';
    if (resultCount === 0) return 'No matches — adjust filters';
    if (resultCount === 1) return 'Show 1 event';
    return `Show ${resultCount} events`;
  }, [resultCount]);

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onClose}
      style={{ maxHeight: Math.round(height * 0.88) }}>
      <View style={styles.headerRow}>
        <Pressable onLongPress={toggleDevSources} delayLongPress={800}>
          <ThemedText type="section">Filters</ThemedText>
        </Pressable>
        {isActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
            onPress={reset}
            hitSlop={Spacing.two}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="link">Reset</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <Section title="When">
          <View style={styles.dateGrid}>
            {DATE_ORDER.map((value) => {
              const selected = dateRange === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDateRange(value)}
                  style={({ pressed }) => [
                    styles.dateCard,
                    {
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="card" themeColor={selected ? 'accentInk' : 'text'}>
                    {dateRangeHeading(value)}
                  </ThemedText>
                  <ThemedText
                    type="meta"
                    style={{
                      color: selected ? theme.accentInk : theme.textSecondary,
                      opacity: selected ? 0.8 : 1,
                    }}>
                    {dateRangeHint(value)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="What">
          <View style={styles.wrapChips}>
            <ChoiceChip
              label="All"
              selected={category === 'all'}
              onPress={() => setCategory('all')}
            />
            {EVENT_CATEGORIES.filter((c) => c !== 'other').map((value: EventCategory) => (
              <ChoiceChip
                key={value}
                label={formatCategory(value)}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
          </View>
        </Section>

        <Section title="Nearby">
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: nearMe }}
            onPress={() => setNearMe(!nearMe)}
            style={({ pressed }) => [
              styles.nearRow,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <View style={styles.nearCopy}>
              <ThemedText type="card">Near me</ThemedText>
              <ThemedText type="meta" themeColor="textSecondary">
                {nearStatus ?? 'Closest events first'}
              </ThemedText>
            </View>
            <View
              style={[
                styles.toggle,
                { backgroundColor: nearMe ? theme.accent : theme.backgroundSelected },
              ]}>
              <View
                style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: nearMe ? theme.accentInk : theme.textSecondary,
                    alignSelf: nearMe ? 'flex-end' : 'flex-start',
                  },
                ]}
              />
            </View>
          </Pressable>
          {nearMe ? (
            <View style={styles.wrapChips}>
              {RADIUS.map((option) => (
                <ChoiceChip
                  key={String(option.value)}
                  label={option.label}
                  selected={nearRadiusKm === option.value}
                  onPress={() => setNearRadiusKm(option.value)}
                />
              ))}
            </View>
          ) : null}
        </Section>

        <SourceFilter
          events={events}
          value={source}
          onChange={setSource}
          unlocked={devSourcesUnlocked}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta}
          onPress={onClose}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="accent" style={styles.done}>
            <ThemedText type="metaBold" themeColor="accentInk">
              {cta}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.three,
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  sectionLabel: {
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  dateCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: 4,
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choiceChip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  nearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  nearCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  done: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.8,
  },
});
