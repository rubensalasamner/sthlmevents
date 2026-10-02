import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventImage } from '@/components/event-image';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';

type PosterTileProps = {
  event: StockholmEvent;
  width?: number;
};

const DEFAULT_WIDTH = 148;

/**
 * 3:4 rail tile. One-line caption under the image — keeps every tile the same
 * height so gaps between rails stay even.
 */
export function PosterTile({ event, width = DEFAULT_WIDTH }: PosterTileProps) {
  const imageHeight = Math.round((width * 4) / 3);

  return (
    <View style={{ width, flexShrink: 0 }}>
      <Link href={`/event/${event.id}`} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <EventImage
            uri={event.imageUrl}
            category={event.category}
            style={{ width, height: imageHeight, borderRadius: Spacing.three }}
            contentPosition="top"
            decodeWidth={width}
            transition={0}
          />
          <ThemedText type="metaBold" numberOfLines={1} ellipsizeMode="tail" style={styles.caption}>
            {event.title}
          </ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: Fonts.display,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.15,
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
