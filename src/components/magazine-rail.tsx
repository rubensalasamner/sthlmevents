import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  /** Optional deep-link into agenda with this rail's filter applied. */
  onSeeAll?: () => void;
};

export function MagazineRailRow({
  title,
  events,
  density = 'compact',
  onSeeAll,
}: MagazineRailRowProps) {
  if (events.length === 0) return null;

  const featured = density === 'featured';
  const width = featured ? FEATURED_WIDTH : COMPACT_WIDTH;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <ThemedText
          type="section"
          themeColor={featured ? 'accent' : 'text'}
          style={[styles.heading, featured && styles.headingFeatured]}>
          {title}
        </ThemedText>
        {onSeeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            onPress={onSeeAll}
            hitSlop={Spacing.two}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="link">See all</ThemedText>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}>
        {events.map((event) => (
          <PosterTile key={event.id} event={event} width={width} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  heading: {
    flex: 1,
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
  pressed: {
    opacity: 0.7,
  },
});
