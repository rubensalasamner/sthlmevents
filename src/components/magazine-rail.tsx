import { ScrollView, StyleSheet, View } from 'react-native';

import { PosterTile } from '@/components/event-presentation';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import type { MagazineRail } from '@/utils/magazine-rails';

const COMPACT_WIDTH = 148;
const FEATURED_WIDTH = 200;

type MagazineRailRowProps = {
  title: string;
  events: StockholmEvent[];
  density?: MagazineRail['density'];
};

export function MagazineRailRow({ title, events, density = 'compact' }: MagazineRailRowProps) {
  if (events.length === 0) return null;

  const featured = density === 'featured';
  const width = featured ? FEATURED_WIDTH : COMPACT_WIDTH;

  return (
    <View style={styles.wrap}>
      <ThemedText
        type="subtitle"
        themeColor={featured ? 'accent' : 'text'}
        style={[styles.heading, featured && styles.headingFeatured]}>
        {title}
      </ThemedText>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {events.map((event) => (
          <PosterTile key={event.id} event={event} width={width} showWhen={featured} />
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
  headingFeatured: {
    fontSize: 24,
    lineHeight: 28,
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
