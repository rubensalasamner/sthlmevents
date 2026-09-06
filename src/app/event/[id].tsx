import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryPill } from '@/components/category-pill';
import { ExternalLink } from '@/components/external-link';
import { FavoriteButton } from '@/components/favorite-button';
import { ScreenHeader } from '@/components/screen-header';
import { ShareButton } from '@/components/share-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useEvent } from '@/hooks/use-events';
import { useTheme } from '@/hooks/use-theme';
import {
  formatCategory,
  formatEventWhen,
  formatPrice,
  ticketCtaLabel,
  venueLine,
} from '@/utils/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, loading, error } = useEvent(id);
  const theme = useTheme();

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
      <Stack.Screen
        options={{
          title: event.title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <ShareButton event={event} />
              <FavoriteButton eventId={event.id} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.body}>
          <CategoryPill label={formatCategory(event.category)} />

          <ScreenHeader title={event.title} />

          <ThemedView type="backgroundElement" style={styles.infoCard}>
            <InfoRow label="When">{formatEventWhen(event)}</InfoRow>
            <InfoRow label="Where">{venueLine([event.venue.name, event.venue.address, event.venue.district])}</InfoRow>
            <InfoRow label="Price">{formatPrice(event.priceSek)}</InfoRow>
            <InfoRow label="Organizer">{event.organizer}</InfoRow>
          </ThemedView>

          <ThemedText type="default">{event.description}</ThemedText>

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
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
  pressed: {
    opacity: 0.7,
  },
  ticketButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    marginTop: Spacing.two,
  },
});
