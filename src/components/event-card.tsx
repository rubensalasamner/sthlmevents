import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { FavoriteButton } from '@/components/favorite-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatCategory, formatEventWhen, formatPrice, venueLine } from '@/utils/format';

export function EventCard({ event }: { event: StockholmEvent }) {
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
              <FavoriteButton eventId={event.id} />
            </View>

            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary">
              {formatEventWhen(event)}
            </ThemedText>

            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {venueLine([event.venue.name, event.venue.district])}
              </ThemedText>
              <ThemedText type="smallBold">{formatPrice(event.priceSek)}</ThemedText>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
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
    fontSize: 22,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
  },
});
