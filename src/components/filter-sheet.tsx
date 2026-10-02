import { type ReactNode, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SourceFilter } from '@/components/source-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFilters } from '@/context/filters-context';
import { useTheme } from '@/hooks/use-theme';
import type { NearRadiusKm } from '@/components/near-me-filter';
import { EVENT_CATEGORIES, type EventCategory, type StockholmEvent } from '@/types/event';
import { type DateRangeValue } from '@/utils/date-range';
import { formatCategory } from '@/utils/format';

type FilterSheetProps = {
  events: readonly StockholmEvent[];
  visible: boolean;
  onClose: () => void;
  nearStatus?: string | null;
  resultCount?: number;
};

const DATE_CARDS: readonly { value: DateRangeValue; label: string; hint: string }[] = [
  { value: 'today', label: 'Today', hint: 'Now → midnight' },
  { value: 'weekend', label: 'Weekend', hint: 'Thu → Sun' },
  { value: 'week', label: 'This week', hint: 'Next 7 days' },
  { value: 'all', label: 'All', hint: 'Everything ahead' },
];

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
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const sheetMax = Math.round(windowHeight * 0.88);
  const scrollMax = Math.round(windowHeight * 0.58);

  const cta = useMemo(() => {
    if (typeof resultCount === 'number') {
      return resultCount === 1 ? 'Show 1 event' : `Show ${resultCount} events`;
    }
    return 'Show events';
  }, [resultCount]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: 'rgba(6, 10, 16, 0.72)' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss filters"
          onPress={onClose}
          style={styles.dismissArea}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              maxHeight: sheetMax,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
              borderTopColor: theme.backgroundElement,
            },
          ]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <ThemedText type="section">Filters</ThemedText>
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
            style={{ maxHeight: scrollMax }}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}>
            <Section title="When">
              <View style={styles.dateGrid}>
                {DATE_CARDS.map((card) => {
                  const selected = dateRange === card.value;
                  return (
                    <Pressable
                      key={card.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setDateRange(card.value)}
                      style={({ pressed }) => [
                        styles.dateCard,
                        {
                          backgroundColor: selected ? theme.accent : theme.backgroundElement,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="card" themeColor={selected ? 'accentInk' : 'text'}>
                        {card.label}
                      </ThemedText>
                      <ThemedText
                        type="meta"
                        style={{
                          color: selected ? theme.accentInk : theme.textSecondary,
                          opacity: selected ? 0.8 : 1,
                        }}>
                        {card.hint}
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
                    {nearStatus ?? 'Sort and filter by your location'}
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
                <View style={styles.radiusRow}>
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

            <Pressable onLongPress={toggleDevSources} delayLongPress={800}>
              <SourceFilter
                events={events}
                value={source}
                onChange={setSource}
                unlocked={devSourcesUnlocked}
              />
            </Pressable>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    backgroundColor: 'rgba(151, 163, 182, 0.45)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
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
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
