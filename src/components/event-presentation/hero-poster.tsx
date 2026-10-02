import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventImage } from '@/components/event-image';
import { FadeInView } from '@/components/fade-in-view';
import { FavoriteButton } from '@/components/favorite-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatEventWhen, formatPrice, venueLine } from '@/utils/format';

type HeroPosterProps = {
  event: StockholmEvent;
};

/** Full-width magazine hero. Time chip on the image; title below for contrast. */
export function HeroPoster({ event }: HeroPosterProps) {
  return (
    <FadeInView duration={380} fromY={16}>
      <Link href={`/event/${event.id}`} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.wrap}>
            <View>
              <EventImage
                uri={event.imageUrl}
                category={event.category}
                style={styles.image}
                contentPosition="top"
                decodeWidth={420}
              />
              <View style={styles.topRow} pointerEvents="box-none">
                <ThemedView type="accent" style={styles.timeChip}>
                  <ThemedText type="metaBold" themeColor="accentInk">
                    {formatEventWhen(event)}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.fav}>
                  <FavoriteButton eventId={event.id} />
                </ThemedView>
              </View>
            </View>
            <View style={styles.body}>
              <ThemedText type="section" numberOfLines={2}>
                {event.title}
              </ThemedText>
              <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
                {venueLine([event.venue.name, event.venue.district])} · {formatPrice(event.priceSek)}
              </ThemedText>
            </View>
          </ThemedView>
        </Pressable>
      </Link>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.two,
  },
  timeChip: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  fav: {
    borderRadius: Spacing.five,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.9,
  },
});
