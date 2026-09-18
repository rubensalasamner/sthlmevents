import { ScrollView, StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/event-presentation';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';

const POSTER_WIDTH = 148;

type MagazineRailRowProps = {
  title: string;
  events: StockholmEvent[];
};

export function MagazineRailRow({ title, events }: MagazineRailRowProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="subtitle" style={styles.heading}>
        {title}
      </ThemedText>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {events.map((event) => (
          <PosterTile key={event.id} event={event} width={POSTER_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  heading: {
    paddingHorizontal: Spacing.four,
    fontSize: 20,
    lineHeight: 24,
  },
  scroller: {
    flexGrow: 0,
  },
  row: {
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
