import { useMemo, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { AttributionFooter } from '@/components/attribution-footer';
import { CompactRow } from '@/components/event-presentation/compact-row';
import { EmptyEventsState } from '@/components/empty-events-state';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getEventSource } from '@/data/event-repository';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';

export type EventSection = {
  title: string;
  data: StockholmEvent[];
};

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'event'; key: string; event: StockholmEvent };

type EventSectionListProps = {
  sections: EventSection[];
  ListHeaderComponent?: ReactElement | null;
  /** Suppresses the empty state until the first load settles. */
  loading?: boolean;
  emptyMessage?: string;
  showEmptyReset?: boolean;
  showEmptyExplore?: boolean;
  contentBottomInset?: number;
  now?: Date;
};

function flatten(sections: readonly EventSection[]): Row[] {
  const rows: Row[] = [];
  for (const section of sections) {
    if (section.data.length === 0) continue;
    rows.push({ kind: 'header', key: `h:${section.title}`, title: section.title });
    for (const event of section.data) {
      rows.push({ kind: 'event', key: `${section.title}:${event.id}`, event });
    }
  }
  return rows;
}

export function EventSectionList({
  sections,
  ListHeaderComponent,
  loading = false,
  emptyMessage = 'No events match your filters.',
  showEmptyReset = false,
  showEmptyExplore = false,
  contentBottomInset = BottomTabInset + Spacing.four,
  now,
}: EventSectionListProps) {
  const theme = useTheme();
  const rows = useMemo(() => flatten(sections), [sections]);
  const clock = now ?? new Date();

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <ThemedText type="metaBold" themeColor="textSecondary" style={styles.section}>
            {item.title}
          </ThemedText>
        ) : (
          <CompactRow event={item.event} now={clock} />
        )
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={<AttributionFooter attribution={getEventSource().attribution} />}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.textSecondary} style={styles.loader} />
        ) : (
          <EmptyEventsState
            message={emptyMessage}
            showReset={showEmptyReset}
            showExplore={showEmptyExplore}
          />
        )
      }
      contentContainerStyle={[styles.content, { paddingBottom: contentBottomInset }]}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
  },
  section: {
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  loader: {
    marginTop: Spacing.six,
  },
});
