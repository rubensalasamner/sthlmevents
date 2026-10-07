import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventSectionList } from '@/components/event-section-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSavedEvents } from '@/context/saved-events-context';
import { groupAgenda } from '@/utils/agenda-groups';
import { eventInterval } from '@/utils/event-interval';

export default function SavedScreen() {
  const { saved, loading, error, reload } = useSavedEvents();

  const grouped = useMemo(() => {
    const now = new Date();
    const upcoming: typeof saved = [];
    const past: typeof saved = [];

    for (const event of saved) {
      if (eventInterval(event).endMs < now.getTime()) past.push(event);
      else upcoming.push(event);
    }

    const upcomingSections = groupAgenda(upcoming, now).map((group) => ({
      key: group.id,
      title: group.label,
      data: group.events,
    }));

    return {
      now,
      sections: [
        ...upcomingSections,
        {
          key: 'past',
          title: 'Past',
          data: [...past].sort((a, b) => eventInterval(b).endMs - eventInterval(a).endMs),
        },
      ],
    };
  }, [saved]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <EventSectionList
          sections={grouped.sections}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage="Save events you care about — they'll show up here."
          now={grouped.now}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="display">Saved</ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    marginHorizontal: -Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
