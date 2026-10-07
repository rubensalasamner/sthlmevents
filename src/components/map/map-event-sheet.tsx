import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { CompactRow } from '@/components/event-presentation/compact-row';
import {
  DetentSheet,
  type DetentSheetHandle,
  type SheetDetent,
} from '@/components/map/detent-sheet';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { distanceKm, eventPoint, type GeoPoint } from '@/utils/geo';

export type MapEventSheetHandle = {
  snapTo: (detent: SheetDetent) => void;
  /** Expand at least to half and scroll the row into view. */
  revealEvent: (id: string) => void;
};

type MapEventSheetProps = {
  ref?: Ref<MapEventSheetHandle>;
  events: readonly StockholmEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userLocation?: GeoPoint | null;
  nearMe?: boolean;
  now?: Date;
};

function sheetTitle(count: number, nearMe: boolean): string {
  if (count === 0) return 'No events on the map';
  if (count === 1) return nearMe ? '1 nearby' : '1 on the map';
  return nearMe ? `${count} nearby` : `${count} on the map`;
}

/** Detent list of mappable events over Explore — peek / half / full. */
export function MapEventSheet({
  ref,
  events,
  selectedId,
  onSelect,
  userLocation = null,
  nearMe = false,
  now = new Date(),
}: MapEventSheetProps) {
  const theme = useTheme();
  const router = useRouter();
  const sheetRef = useRef<DetentSheetHandle>(null);
  const listRef = useRef<FlatList<StockholmEvent>>(null);
  const detentRef = useRef<SheetDetent>('peek');

  const distances = useMemo(() => {
    if (!userLocation) return null;
    const map = new Map<string, number>();
    for (const event of events) {
      const point = eventPoint(event);
      if (point) map.set(event.id, distanceKm(userLocation, point));
    }
    return map;
  }, [events, userLocation]);

  const title = sheetTitle(events.length, nearMe && Boolean(userLocation));

  useImperativeHandle(
    ref,
    () => ({
      snapTo: (detent) => sheetRef.current?.snapTo(detent),
      revealEvent: (id) => {
        if (detentRef.current === 'peek') sheetRef.current?.snapTo('half');
        const index = events.findIndex((event) => event.id === id);
        if (index < 0) return;
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
        });
      },
    }),
    [events],
  );

  useEffect(() => {
    if (!selectedId) return;
    const index = events.findIndex((event) => event.id === selectedId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    });
  }, [selectedId, events]);

  return (
    <DetentSheet
      ref={sheetRef}
      bottomInset={BottomTabInset}
      onDetentChange={(next) => {
        detentRef.current = next;
      }}
      header={
        <View style={styles.headerInner}>
          <View style={[styles.handle, { backgroundColor: theme.textSecondary }]} />
          <ThemedText type="metaBold" themeColor="textSecondary" style={styles.title}>
            {title}
          </ThemedText>
        </View>
      }>
      {({ scrollEnabled }) => (
        <FlatList
          ref={listRef}
          data={events as StockholmEvent[]}
          keyExtractor={(item) => item.id}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={scrollEnabled}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.15,
              });
            }, 50);
          }}
          renderItem={({ item }) => (
            <CompactRow
              event={item}
              selected={item.id === selectedId}
              distanceKm={distances?.get(item.id)}
              now={now}
              onPress={() => {
                onSelect(item.id);
                router.push(`/event/${item.id}` as Href);
              }}
            />
          )}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}
    </DetentSheet>
  );
}

const styles = StyleSheet.create({
  headerInner: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.45,
  },
  title: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
});
