import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/context/favorites-context';
import { useEvents } from '@/hooks/use-events';
import type { StockholmEvent } from '@/types/event';
import { stockholmMidnight } from '@/utils/date-range';

type SavedTab = 'favourites' | 'upcoming';

export default function SavedScreen() {
  const { data: events, loading, error, reload } = useEvents();
  const { favoriteIds } = useFavorites();
  const [tab, setTab] = useState<SavedTab>('favourites');

  const saved = useMemo(
    () =>
      events
        .filter((event) => favoriteIds.has(event.id))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events, favoriteIds],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.pad}>
          <ThemedText type="title">My events</ThemedText>
          <View style={styles.tabRow}>
            <SavedTabPill
              label="Favourites"
              active={tab === 'favourites'}
              onPress={() => setTab('favourites')}
            />
            <SavedTabPill
              label="Upcoming"
              active={tab === 'upcoming'}
              onPress={() => setTab('upcoming')}
            />
          </View>
        </View>
        {tab === 'favourites' ? (
          <FavouritesGroups events={saved} loading={loading} error={error} onRetry={reload} />
        ) : (
          <UpcomingList events={saved} loading={loading} error={error} onRetry={reload} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function SavedTabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <ThemedView
      type={active ? 'backgroundSelected' : 'backgroundElement'}
      style={styles.tabPill}>
      <ThemedText
        onPress={onPress}
        type="smallBold"
        themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function FavouritesGroups({
  events,
  loading,
  error,
  onRetry,
}: {
  events: StockholmEvent[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (loading && events.length === 0) return <ListMessage text="Loading…" />;
  if (error) return <ListMessage text="Something went wrong loading events." />;

  if (events.length === 0) {
    return (
      <ListMessage text="Never miss a happening! You'll find all your saved events here." />
    );
  }

  const { thisWeek, upcoming } = splitByWeek(events);

  return (
    <View style={styles.listContent}>
      {thisWeek.length > 0 && (
        <Section label="This week">
          {thisWeek.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section label="Upcoming">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Section>
      )}
    </View>
  );
}

function UpcomingList({
  events,
  loading,
  error,
  onRetry,
}: {
  events: StockholmEvent[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (loading && events.length === 0) return <ListMessage text="Loading…" />;
  if (error) return <ListMessage text="Something went wrong loading events." />;
  if (events.length === 0) return <ListMessage text="No saved events upcoming." />;

  return (
    <View style={styles.listContent}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{label}</ThemedText>
      {children}
    </View>
  );
}

function ListMessage({ text }: { text: string }) {
  return (
    <View style={styles.messageWrap}>
      <ThemedText themeColor="textSecondary" style={styles.messageText}>
        {text}
      </ThemedText>
    </View>
  );
}

/** Splits chronologically-saved events into "this week" (Stockholm calendar) and later. */
function splitByWeek(events: StockholmEvent[]): { thisWeek: StockholmEvent[]; upcoming: StockholmEvent[] } {
  const weekEnd = stockholmMidnight(7, new Date()).getTime();
  const thisWeek = events.filter((event) => new Date(event.startsAt).getTime() < weekEnd);
  const upcoming = events.filter((event) => new Date(event.startsAt).getTime() >= weekEnd);
  return { thisWeek, upcoming };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tabPill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  messageWrap: {
    padding: Spacing.four,
  },
  messageText: {
    textAlign: 'center',
  },
});
