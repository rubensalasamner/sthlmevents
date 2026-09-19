import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { DirectionsButton } from '@/components/directions-button';
import { EventImage } from '@/components/event-image';
import { ExpandableText } from '@/components/expandable-text';
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
  const hasSticky = hasDirections || hasTickets;
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
          {
            paddingBottom: hasSticky
              ? Spacing.four
              : Math.max(insets.bottom, Spacing.two) + Spacing.four,
          },
        ]}>
        <View style={styles.hero}>
          <EventImage
            uri={event.imageUrl}
            category={event.category}
            style={styles.image}
            decodeWidth={720}
          />
          <View style={[styles.topBar, { paddingTop: insets.top + Spacing.two }]}>
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
          {event.description ? <ExpandableText>{event.description}</ExpandableText> : null}
          <AddToCalendarButton event={event} />
        </View>
      </ScrollView>

      {hasSticky ? (
        <ThemedView
          style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
          {hasDirections ? <DirectionsButton event={event} /> : null}
          {event.ticketUrl ? (
            <View style={styles.ticketFlex}>
              <ExternalLink href={event.ticketUrl} asChild>
                <Pressable style={({ pressed }) => [styles.ticketPress, pressed && styles.pressed]}>
                  <ThemedView type="accent" style={styles.ticketButton}>
                    <ThemedText type="smallBold" themeColor="accentInk" numberOfLines={1}>
                      {ticketCtaLabel(event)}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </ExternalLink>
            </View>
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
    gap: Spacing.three,
  },
  hero: {
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
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
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
    alignItems: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(151, 163, 182, 0.25)',
  },
  ticketFlex: {
    flex: 1,
    minWidth: 0,
  },
  ticketPress: {
    flexGrow: 1,
  },
  ticketButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
