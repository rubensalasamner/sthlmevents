import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventImage } from '@/components/event-image';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { BADGE_INK, CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { formatCategory, formatEventWhen, formatPrice, venueLine } from '@/utils/format';

type Props = {
  event: StockholmEvent;
  onDismiss: () => void;
};

/**
 * Bottom peek over the map: image + title live here (not on every pin).
 * Tap opens the detail screen; dismiss via the X or an empty map tap.
 */
export function MapEventPeek({ event, onDismiss }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Spacing.two) + BottomTabInset + Spacing.two;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <ThemedView type="backgroundElement" style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => router.push(`/event/${event.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${event.title}`}
        >
          <EventImage
            uri={event.imageUrl}
            category={event.category}
            style={styles.thumb}
            transition={150}
          />
          <View style={styles.body}>
            <ThemedView
              style={[styles.badge, { backgroundColor: CATEGORY_BADGE_COLORS[event.category] }]}
            >
              <ThemedText type="smallBold" style={styles.badgeText}>
                {formatCategory(event.category).toUpperCase()}
              </ThemedText>
            </ThemedView>
            <ThemedText type="smallBold" themeColor="accent" numberOfLines={1}>
              {formatEventWhen(event)}
            </ThemedText>
            <ThemedText type="subtitle" numberOfLines={2} style={styles.title}>
              {event.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {venueLine([event.venue.name, event.venue.district])} · {formatPrice(event.priceSek)}
            </ThemedText>
          </View>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          style={styles.dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Icon sf="xmark" material="close" size={18} color={theme.textSecondary} />
        </Pressable>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
  },
  card: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.five,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: Spacing.three,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  badgeText: {
    color: BADGE_INK,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  dismiss: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    padding: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
});
