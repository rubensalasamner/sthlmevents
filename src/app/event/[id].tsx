import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { DirectionsButton } from '@/components/directions-button';
import { EventImage } from '@/components/event-image';
import { ExternalLink } from '@/components/external-link';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { ShareButton } from '@/components/share-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useInterests } from '@/context/interests-context';
import { useEvent } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { directionsQuery } from '@/utils/directions';
import { isOngoing } from '@/utils/event-interval';
import {
  formatCategory,
  formatEventClock,
  formatEventDate,
  formatEventWhen,
  formatPrice,
  ticketCtaLabel,
  venueLine,
} from '@/utils/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, loading, error } = useEvent(id);
  const { recordEventOpen } = useInterests();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (event?.id) recordEventOpen(event.id);
  }, [event?.id, recordEventOpen]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Event' }} />
        <ActivityIndicator color={theme.textSecondary} />
      </ThemedView>
    );
  }

  if (error || !event) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This event could not be found.</ThemedText>
      </ThemedView>
    );
  }

  const hasDirections = Boolean(directionsQuery(event));
  const hasTickets = Boolean(event.ticketUrl);
  const when = isOngoing(event, new Date())
    ? formatEventWhen(event)
    : `${formatEventDate(event.startsAt)} · ${formatEventClock(event.startsAt)}`;
  const venue = venueLine([event.venue.name, event.venue.address, event.venue.district]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: Spacing.six },
        ]}>
        <View style={styles.hero}>
          <EventImage
            uri={event.imageUrl}
            category={event.category}
            style={styles.image}
            decodeWidth={480}
          />
          <View style={styles.topBar}>
            <ThemedView style={styles.circleButton}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => pressed && styles.pressed}>
                <Icon sf="chevron.left" material="arrow_back" size={20} color={theme.text} />
              </Pressable>
            </ThemedView>
            <View style={styles.topActions}>
              <ThemedView style={styles.circleButton}>
                <ShareButton event={event} />
              </ThemedView>
              <ThemedView style={styles.circleButton}>
                <FavoriteButton eventId={event.id} />
              </ThemedView>
            </View>
          </View>
          <View style={styles.scrim} pointerEvents="none">
            <ThemedText type="subtitle" numberOfLines={2} style={styles.imageTitle}>
              {event.title}
            </ThemedText>
          </View>
        </View>

        <View style={styles.body}>
          <ThemedText type="smallBold" themeColor="accent">
            {when}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            {event.title}
          </ThemedText>
          {venue ? (
            <ThemedText type="small" themeColor="textSecondary">
              {venue}
            </ThemedText>
          ) : null}
          <View style={styles.pillRow}>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="smallBold">{formatPrice(event.priceSek)}</ThemedText>
            </ThemedView>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="smallBold">{formatCategory(event.category)}</ThemedText>
            </ThemedView>
          </View>
          {event.description ? (
            <ThemedText type="default">{event.description}</ThemedText>
          ) : null}
          <AddToCalendarButton event={event} />
        </View>
      </ScrollView>

      {hasDirections || hasTickets ? (
        <ThemedView style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
          {hasDirections ? <DirectionsButton event={event} /> : null}
          {event.ticketUrl ? (
            <ExternalLink href={event.ticketUrl} asChild>
              <Pressable style={({ pressed }) => [styles.ticketFlex, pressed && styles.pressed]}>
                <ThemedView type="accent" style={styles.ticketButton}>
                  <ThemedText type="smallBold" themeColor="accentInk">
                    {ticketCtaLabel(event)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </ExternalLink>
          ) : null}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.four,
  },
  hero: {
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.two,
  },
  topActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    backgroundColor: 'rgba(11, 14, 20, 0.45)',
  },
  imageTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: '#F2F5F9',
  },
  body: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  sticky: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  ticketFlex: {
    flex: 1,
  },
  ticketButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
