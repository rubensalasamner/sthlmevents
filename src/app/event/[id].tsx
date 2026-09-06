import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { FavoriteButton } from '@/components/favorite-button';
import { Icon } from '@/components/icon';
import { ShareButton } from '@/components/share-button';
import { SourceTag } from '@/components/source-tag';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useEvent } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import {
  formatEventDate,
  formatEventTimeRange,
  formatPrice,
  ticketCtaLabel,
  venueLine,
} from '@/utils/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, loading, error } = useEvent(id);
  const theme = useTheme();
  const router = useRouter();

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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
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
        </View>

        <ThemedView style={styles.sheet}>
          <View style={styles.sheetBody}>
            <View style={styles.pillRow}>
              <SourceTag source={event.source} />
            </View>

            <ThemedText type="subtitle">{event.title}</ThemedText>

            <ThemedText type="small" themeColor="textSecondary">
              {venueLine([event.venue.name, event.venue.district])}
            </ThemedText>

            <ThemedText type="default">{event.description}</ThemedText>

            <ThemedView type="backgroundElement" style={styles.infoCard}>
              <InfoRow label="When">
                {formatEventDate(event.startsAt)}
                {event.endsAt ? ` · ${formatEventTimeRange(event)}` : ''}
              </InfoRow>
              <InfoRow label="Where">{venueLine([event.venue.name, event.venue.address])}</InfoRow>
              <InfoRow label="Price">{formatPrice(event.priceSek)}</InfoRow>
              <InfoRow label="Organizer">{event.organizer}</InfoRow>
            </ThemedView>

            {event.ticketUrl && (
              <ExternalLink href={event.ticketUrl} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundSelected" style={styles.ticketButton}>
                    <ThemedText type="smallBold">{ticketCtaLabel(event)}</ThemedText>
                  </ThemedView>
                </Pressable>
              </ExternalLink>
            )}
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue}>
        {children}
      </ThemedText>
    </View>
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
    paddingBottom: Spacing.six,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.three,
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
  sheet: {
    flex: 1,
    marginTop: -Spacing.five,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
  },
  sheetBody: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  infoLabel: {
    width: 80,
  },
  infoValue: {
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
