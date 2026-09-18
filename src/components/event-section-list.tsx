import { useMemo, type ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AttributionFooter } from '@/components/attribution-footer';
import { CompactRow } from '@/components/event-presentation/compact-row';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { getEventSource } from '@/data/event-repository';
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
  emptyMessage?: string;
  contentBottomInset?: number;
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
  emptyMessage = 'No events match your filters.',
  contentBottomInset = BottomTabInset + Spacing.four,
}: EventSectionListProps) {
  const rows = useMemo(() => flatten(sections), [sections]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
            {item.title}
          </ThemedText>
        ) : (
          <CompactRow event={item.event} />
        )
      }
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={<AttributionFooter attribution={getEventSource().attribution} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {emptyMessage}
          </ThemedText>
        </View>
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
    fontFamily: Fonts.display,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  empty: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
