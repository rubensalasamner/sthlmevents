import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventImage } from '@/components/event-image';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';
import { formatEventClock } from '@/utils/format';

type PosterTileProps = {
  event: StockholmEvent;
  width?: number;
};

const DEFAULT_WIDTH = 148;

/** 3:4 rail tile. Title lives under the image so fallback art still reads. */
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
            decodeWidth={width}
            transition={0}
          />
          <View style={styles.body}>
            <ThemedText type="smallBold" themeColor="accent" numberOfLines={1}>
              {formatEventClock(event.startsAt)}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: Spacing.two,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
