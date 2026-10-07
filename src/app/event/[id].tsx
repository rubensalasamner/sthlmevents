import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { CircleSurface, DetailTopBar } from '@/components/detail-top-bar';
import { DirectionsButton } from '@/components/directions-button';
import { EventImage } from '@/components/event-image';
import { ExpandableText } from '@/components/expandable-text';
import { ExternalLink } from '@/components/external-link';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { RelatedEvents } from '@/components/related-events';
import { ShareButton } from '@/components/share-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useInterests } from '@/context/interests-context';
import { useSavedEvents } from '@/context/saved-events-context';
import { decodeRouteId, useEvent } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import { BADGE_INK, CATEGORY_BADGE_COLORS } from '@/utils/category-colors';
import { directionsQuery } from '@/utils/directions';
import { eventInterval, isOngoing } from '@/utils/event-interval';
import { eventPoint } from '@/utils/geo';
import {
  formatCategory,
  formatEventClock,
  formatEventDate,
  formatEventWhen,
  formatPrice,
  ticketCtaLabel,
  venueLine,
} from '@/utils/format';

function CenteredState({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <ThemedView style={styles.centered}>
      <DetailTopBar onBack={onBack} />
      {children}
    </ThemedView>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useEvent(id);
  const { snapshotFor } = useSavedEvents();
  const { recordEventOpen } = useInterests();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const event = data ?? (loading || !id ? null : snapshotFor(decodeRouteId(id)));

  useEffect(() => {
    if (event?.id) recordEventOpen(event.id);
  }, [event?.id, recordEventOpen]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  };

  if (loading) {
    return (
      <CenteredState onBack={goBack}>
        <ActivityIndicator color={theme.textSecondary} />
      </CenteredState>
    );
  }

  if (!event) {
    return (
      <CenteredState onBack={goBack}>
        <ThemedText type="meta" themeColor="textSecondary">
          This event could not be found.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse events"
          onPress={() => router.replace('/' as Href)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="link">Browse events</ThemedText>
        </Pressable>
      </CenteredState>
    );
  }

  const now = new Date();
  const ended = eventInterval(event).endMs < now.getTime();
  const hasDirections = !ended && Boolean(directionsQuery(event));
  const hasTickets = !ended && Boolean(event.ticketUrl);
  const hasSticky = hasDirections || hasTickets;
  const onMap = !ended && Boolean(eventPoint(event));
  const when = ended
    ? `Ended · ${formatEventDate(event.startsAt)}`
    : isOngoing(event, now)
      ? formatEventWhen(event, now)
      : `${formatEventDate(event.startsAt)} · ${formatEventClock(event.startsAt)}`;
  const venue = venueLine([event.venue.name, event.venue.address, event.venue.district]);

  return (
    <ThemedView style={styles.container}>
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
            contentPosition="top"
            decodeWidth={720}
          />
          <DetailTopBar onBack={goBack}>
            <CircleSurface>
              <ShareButton event={event} />
            </CircleSurface>
            <CircleSurface>
              <FavoriteButton eventId={event.id} />
            </CircleSurface>
          </DetailTopBar>
        </View>

        <View style={styles.body}>
          <ThemedText type="metaBold" themeColor="accent">
            {when}
          </ThemedText>
          <ThemedText type="display">{event.title}</ThemedText>
          {venue ? (
            <ThemedText type="meta" themeColor="textSecondary">
              {venue}
            </ThemedText>
          ) : null}
          <View style={styles.pillRow}>
            <ThemedView type="backgroundSelected" style={styles.chip}>
              <ThemedText type="metaBold">{formatPrice(event.priceSek)}</ThemedText>
            </ThemedView>
            <View style={[styles.chip, { backgroundColor: CATEGORY_BADGE_COLORS[event.category] }]}>
              <ThemedText type="metaBold" style={styles.categoryInk}>
                {formatCategory(event.category)}
              </ThemedText>
            </View>
          </View>
          {event.description ? <ExpandableText>{event.description}</ExpandableText> : null}
          <View style={styles.secondaryActions}>
            {ended ? null : <AddToCalendarButton event={event} />}
            {onMap ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show on map"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/map', params: { eventId: event.id } } as Href)
                }
                hitSlop={Spacing.two}
                style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}>
                <Icon sf="map" material="map" size={16} color={theme.accent} />
                <ThemedText type="link">Show on map</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
        <RelatedEvents event={event} />
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
                    <ThemedText type="metaBold" themeColor="accentInk" numberOfLines={1}>
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
  body: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
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
  categoryInk: {
    color: BADGE_INK,
  },
  secondaryActions: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
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
