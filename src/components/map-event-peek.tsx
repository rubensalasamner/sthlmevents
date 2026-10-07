import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBadge } from '@/components/category-badge';
import { EventImage } from '@/components/event-image';
import { FadeInView } from '@/components/fade-in-view';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { formatEventWhen, formatPrice, venueLine } from '@/utils/format';

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
    <FadeInView
      duration={280}
      fromY={18}
      style={[styles.wrap, { paddingBottom: bottomPad }]}
      pointerEvents="box-none">
      <ThemedView type="backgroundElement" style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => router.push(`/event/${event.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${event.title}`}>
          <EventImage
            uri={event.imageUrl}
            category={event.category}
            style={styles.thumb}
            contentPosition="top"
            decodeWidth={88}
            transition={150}
          />
          <View style={styles.body}>
            <CategoryBadge category={event.category} />
            <ThemedText type="metaBold" themeColor="accent" numberOfLines={1}>
              {formatEventWhen(event)}
            </ThemedText>
            <ThemedText type="card" numberOfLines={2}>
              {event.title}
            </ThemedText>
            <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
              {venueLine([event.venue.name, event.venue.district])} · {formatPrice(event.priceSek)}
            </ThemedText>
          </View>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          style={styles.dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss">
          <Icon sf="xmark" material="close" size={18} color={theme.textSecondary} />
        </Pressable>
      </ThemedView>
    </FadeInView>
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
