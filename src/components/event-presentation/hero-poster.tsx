import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventImage } from '@/components/event-image';
import { FavoriteButton } from '@/components/favorite-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatEventWhen, formatPrice, venueLine } from '@/utils/format';

type HeroPosterProps = {
  event: StockholmEvent;
};

/** Full-width magazine hero. Time chip on the image; title below for contrast. */
export function HeroPoster({ event }: HeroPosterProps) {
  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.wrap}>
          <View>
            <EventImage
              uri={event.imageUrl}
              category={event.category}
              style={styles.image}
              decodeWidth={420}
            />
            <View style={styles.topRow} pointerEvents="box-none">
              <ThemedView type="accent" style={styles.timeChip}>
                <ThemedText type="smallBold" themeColor="accentInk">
                  {formatEventWhen(event)}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.fav}>
                <FavoriteButton eventId={event.id} />
              </ThemedView>
            </View>
          </View>
          <View style={styles.body}>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {venueLine([event.venue.name, event.venue.district])} · {formatPrice(event.priceSek)}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Link>
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  pressed: {
    opacity: 0.9,
  },
});
