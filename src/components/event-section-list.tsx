import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
  type Ref,
} from 'react';
import { FlatList, StyleSheet, type ViewToken } from 'react-native';

import { AttributionFooter } from '@/components/attribution-footer';
import { CompactRow } from '@/components/event-presentation/compact-row';
import { EventsStatus } from '@/components/events-status';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getEventSource } from '@/data/event-repository';
import type { StockholmEvent } from '@/types/event';

export type EventSection = {
  /** Stable id; defaults to the title. */
  key?: string;
  title: string;
  /** Stockholm YYYY-MM-DD, for day jumps and the visible-day callback. */
  dayKey?: string | null;
  data: StockholmEvent[];
};

export type EventSectionListHandle = {
  scrollToDay: (dayKey: string) => void;
};

type Row =
  | { kind: 'header'; key: string; title: string; dayKey: string | null }
  | { kind: 'event'; key: string; event: StockholmEvent; dayKey: string | null };

type EventSectionListProps = {
  ref?: Ref<EventSectionListHandle>;
  sections: EventSection[];
  ListHeaderComponent?: ReactElement | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyMessage?: string;
  showEmptyReset?: boolean;
  showEmptyExplore?: boolean;
  contentBottomInset?: number;
  now?: Date;
  /** Day of the topmost visible row. */
  onTopDayChange?: (dayKey: string) => void;
};

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

function flatten(sections: readonly EventSection[]): Row[] {
  const rows: Row[] = [];
  for (const section of sections) {
    if (section.data.length === 0) continue;
    const key = section.key ?? section.title;
    const dayKey = section.dayKey ?? null;
    rows.push({ kind: 'header', key: `h:${key}`, title: section.title, dayKey });
    for (const event of section.data) {
      rows.push({ kind: 'event', key: `${key}:${event.id}`, event, dayKey });
    }
  }
  return rows;
}

export function EventSectionList({
  ref,
  sections,
  ListHeaderComponent,
  loading,
  error,
  onRetry,
  emptyMessage = 'No events match your filters.',
  showEmptyReset = false,
  showEmptyExplore = false,
  contentBottomInset = BottomTabInset + Spacing.four,
  now,
  onTopDayChange,
}: EventSectionListProps) {
  const listRef = useRef<FlatList<Row>>(null);
  const rows = useMemo(() => flatten(sections), [sections]);
  const retriedRef = useRef(false);
  const onTopDayChangeRef = useRef(onTopDayChange);
  const clock = now ?? new Date();

  useEffect(() => {
    onTopDayChangeRef.current = onTopDayChange;
  }, [onTopDayChange]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToDay(dayKey) {
        const index = rows.findIndex((row) => row.kind === 'header' && row.dayKey === dayKey);
        if (index < 0) return;
        retriedRef.current = false;
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
      },
    }),
    [rows],
  );

  // Rows have variable heights and no getItemLayout: jump near the target so
  // it renders, then retry once for the exact position.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      if (retriedRef.current) return;
      retriedRef.current = true;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0 });
      }, 50);
    },
    [],
  );

  // FlatList rejects a changing onViewableItemsChanged, so this stays stable.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Row>[] }) => {
      let top: ViewToken<Row> | undefined;
      for (const token of viewableItems) {
        if (!token.item.dayKey || token.index === null) continue;
        if (!top || (top.index !== null && token.index < top.index)) top = token;
      }
      if (top?.item.dayKey) onTopDayChangeRef.current?.(top.item.dayKey);
    },
    [],
  );

  return (
    <FlatList
      ref={listRef}
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
        <EventsStatus
          loading={loading}
          error={error}
          empty
          onRetry={onRetry}
          emptyMessage={emptyMessage}
          showReset={showEmptyReset}
          showExplore={showEmptyExplore}
        />
      }
      onScrollToIndexFailed={onScrollToIndexFailed}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY_CONFIG}
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
});
