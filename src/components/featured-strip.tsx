import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatCategory, formatEventWhen, formatPrice } from '@/utils/format';

const CARD_WIDTH = 280;

type FeaturedStripProps = {
  events: StockholmEvent[];
};

export function FeaturedStrip({ events }: FeaturedStripProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold" style={styles.heading}>
        Featured
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {events.map((event) => (
          <FeaturedCard key={event.id} event={event} />
        ))}
      </ScrollView>
    </View>
  );
}

function FeaturedCard({ event }: { event: StockholmEvent }) {
  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.body}>
            <View style={styles.topRow}>
              <CategoryPill label={formatCategory(event.category)} />
              <ThemedText type="smallBold">{formatPrice(event.priceSek)}</ThemedText>
            </View>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatEventWhen(event)} · {event.venue.name}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  heading: {
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.85,
  },
});
