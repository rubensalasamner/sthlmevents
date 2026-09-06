import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { AttributionFooter } from '@/components/attribution-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getEventSource } from '@/data/event-repository';
import type { StockholmEvent } from '@/types/event';

type EventListProps = {
  events: StockholmEvent[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  ListHeaderComponent?: ReactElement;
  emptyMessage?: string;
};

export function EventList({
  events,
  loading = false,
  error = null,
  onRetry,
  ListHeaderComponent,
  emptyMessage = 'No events found.',
}: EventListProps) {
  const theme = useTheme();

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        {ListHeaderComponent}
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        {ListHeaderComponent}
        <ThemedText themeColor="textSecondary" style={styles.message}>
          Something went wrong loading events.
        </ThemedText>
        {onRetry && (
          <Pressable onPress={onRetry} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="linkPrimary">Try again</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} />}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={<AttributionFooter attribution={getEventSource().attribution} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <ThemedView style={styles.emptyWrap}>
          <ThemedText themeColor="textSecondary" style={styles.message}>
            {emptyMessage}
          </ThemedText>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: 0,
  },
  separator: {
    height: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  message: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
