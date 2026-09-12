import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FavoriteButton } from '@/components/favorite-button';
import { MoreDatesBadge } from '@/components/more-dates-badge';
import { SourceTag } from '@/components/source-tag';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { BADGE_INK, CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { formatCategory, formatEventWhen, formatPrice, venueLine } from '@/utils/format';

export function EventCard({ event, width }: { event: StockholmEvent; width?: number }) {
  const theme = useTheme();

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={({ pressed }) => [width ? { width } : null, pressed && styles.pressed]}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View>
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageOverlay}>
              <View style={styles.badgeColumn}>
                <ThemedView style={[styles.categoryBadge, { backgroundColor: CATEGORY_BADGE_COLORS[event.category] }]}>
                  <ThemedText type="smallBold" style={styles.badgeText}>
                    {formatCategory(event.category).toUpperCase()}
                  </ThemedText>
                </ThemedView>
                <SourceTag source={event.source} />
              </View>
              <ThemedView style={styles.favoriteBubble}>
                <FavoriteButton eventId={event.id} />
              </ThemedView>
            </View>
          </View>

          <View style={styles.body}>
            <ThemedText type="smallBold" themeColor="accent">
              {formatEventWhen(event)}
            </ThemedText>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {venueLine([event.venue.name, event.venue.district])} · {formatPrice(event.priceSek)}
            </ThemedText>
            {event.nextDates && event.nextDates.length > 0 && (
              <MoreDatesBadge count={event.nextDates.length} />
            )}
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
    aspectRatio: 21 / 9,
  },
  imageOverlay: {
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
  badgeColumn: {
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  categoryBadge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  badgeText: {
    color: BADGE_INK,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  favoriteBubble: {
    borderRadius: Spacing.five,
    padding: Spacing.one,
  },
  body: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
