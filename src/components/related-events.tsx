import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MagazineRailRow } from '@/components/magazine-rail';
import { Spacing } from '@/constants/theme';
import { useFilteredEvents } from '@/context/filtered-events-context';
import type { StockholmEvent } from '@/types/event';
import { relatedRails } from '@/utils/related-events';

/** Venue / organizer / same-day-nearby rails under the event detail. */
export function RelatedEvents({ event }: { event: StockholmEvent }) {
  const { events } = useFilteredEvents();
  const rails = useMemo(() => relatedRails(event, events, new Date()), [event, events]);

  if (rails.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {rails.map((rail) => (
        <MagazineRailRow
          key={rail.id}
          title={rail.title}
          events={rail.events}
          showCategory={rail.mixed}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
});
