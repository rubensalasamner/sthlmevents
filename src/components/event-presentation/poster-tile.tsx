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
  /** Quiet time line under the title — featured rail only. */
  showWhen?: boolean;
};

const DEFAULT_WIDTH = 148;

/** 3:4 rail tile. Title under the image; optional time for featured rails. */
export function PosterTile({ event, width = DEFAULT_WIDTH, showWhen = false }: PosterTileProps) {
  const imageHeight = Math.round((width * 4) / 3);
  const featured = width > DEFAULT_WIDTH;

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
            <ThemedText
              type="smallBold"
              numberOfLines={2}
              style={[styles.title, featured && styles.titleFeatured]}>
              {event.title}
            </ThemedText>
            {showWhen ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {formatEventClock(event.startsAt)}
              </ThemedText>
            ) : null}
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
  titleFeatured: {
    fontSize: 16,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
});
