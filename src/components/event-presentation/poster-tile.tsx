import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryBadge } from '@/components/category-badge';
import { EventImage } from '@/components/event-image';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import type { StockholmEvent } from '@/types/event';

type PosterTileProps = {
  event: StockholmEvent;
  width?: number;
  /** Mixed rails (window / free) — category isn't in the section title. */
  showCategory?: boolean;
};

const DEFAULT_WIDTH = 148;

/**
 * 3:2 rail tile. Landscape-ish so typical event photos stay readable under
 * cover-crop; one-line caption under the image keeps rail heights even.
 */
export function PosterTile({
  event,
  width = DEFAULT_WIDTH,
  showCategory = false,
}: PosterTileProps) {
  const imageHeight = Math.round((width * 2) / 3);

  return (
    <View style={{ width, flexShrink: 0 }}>
      <Link href={`/event/${event.id}`} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <View>
            <EventImage
              uri={event.imageUrl}
              category={event.category}
              style={{ width, height: imageHeight, borderRadius: Spacing.three }}
              contentPosition="center"
              decodeWidth={width}
              transition={0}
            />
            {showCategory ? (
              <View style={styles.badge} pointerEvents="none">
                <CategoryBadge category={event.category} />
              </View>
            ) : null}
          </View>
          <ThemedText type="metaBold" numberOfLines={1} ellipsizeMode="tail" style={styles.caption}>
            {event.title}
          </ThemedText>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
  },
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
