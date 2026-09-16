import { ScrollView, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';

const CARD_WIDTH = 240;

type FeaturedStripProps = {
  events: StockholmEvent[];
  /** Override the strip heading (e.g. "This weekend" on Thu–Sun default). */
  heading?: string;
};

export function FeaturedStrip({ events, heading = 'Featured' }: FeaturedStripProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="subtitle" style={styles.heading}>
        {heading} <ThemedText type="small" themeColor="textSecondary">{events.length}</ThemedText>
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} width={CARD_WIDTH} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  heading: {
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
