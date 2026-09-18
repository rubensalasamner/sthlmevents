import { memo } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventImage } from '@/components/event-image';
import { MoreDatesBadge } from '@/components/more-dates-badge';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StockholmEvent } from '@/types/event';
import { isOngoing } from '@/utils/event-interval';
import { formatEventClock, formatPrice, venueLine } from '@/utils/format';
import { formatDistanceKm } from '@/utils/geo';

const LIST_NOW = new Date();

type CompactRowProps = {
  event: StockholmEvent;
  selected?: boolean;
  distanceKm?: number;
  onPress?: () => void;
};

/** Dense agenda / sheet / saved row. Time gutter + square thumb. */
export const CompactRow = memo(function CompactRow({
  event,
  selected = false,
  distanceKm,
  onPress,
}: CompactRowProps) {
  const theme = useTheme();
  const time = isOngoing(event, LIST_NOW) ? 'NOW' : formatEventClock(event.startsAt);
  const meta = [
    venueLine([event.venue.name, event.venue.district]),
    distanceKm !== undefined ? formatDistanceKm(distanceKm) : formatPrice(event.priceSek),
  ]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <View
      style={[
        styles.row,
        selected ? { backgroundColor: theme.backgroundSelected } : null,
      ]}>
      <ThemedText type="smallBold" themeColor="accent" style={styles.time}>
        {time}
      </ThemedText>
      <EventImage
        uri={event.imageUrl}
        category={event.category}
        style={styles.thumb}
        decodeWidth={56}
        transition={0}
      />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {event.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {meta}
        </ThemedText>
        {event.nextDates && event.nextDates.length > 0 ? (
          <MoreDatesBadge count={event.nextDates.length} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={event.title}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}>
        {body}
      </Pressable>
    );
  }

  return (
    <Link href={`/event/${event.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>{body}</Pressable>
    </Link>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  time: {
    width: 44,
    fontVariant: ['tabular-nums'],
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
