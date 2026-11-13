import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const CONTACT_URL = 'https://github.com/rubensalasamner/sthlmevents/issues';

/**
 * Public product page for the Play / App Store “Website” field.
 * Hosted on the Vercel web export at `/about`.
 */
export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.five },
        ]}
      >
        <ThemedText type="display">sthlmevents</ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.lede}>
          Discover what’s on in Stockholm — concerts, culture, markets, nightlife, and more —
          on a magazine-style home feed, a map, and a saved list.
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="section">What it is</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            sthlmevents aggregates public event listings from many Stockholm sources into one daily
            snapshot. Browse this weekend or the week ahead, filter by interest, find things near
            you, favourite events, and open tickets or directions when you’re ready to go.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="section">Platforms</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Available on Android (Google Play), with iOS and web builds from the same Expo app. No
            account required — favourites and preferences stay on your device.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="section">Open the app</ThemedText>
          <Link href={'/' as Href}>
            <ThemedText type="link">sthlmevents.vercel.app</ThemedText>
          </Link>
        </View>

        <View style={styles.section}>
          <ThemedText type="section">Privacy</ThemedText>
          <Link href={'/privacy' as Href}>
            <ThemedText type="link">Privacy policy</ThemedText>
          </Link>
        </View>

        <View style={styles.section}>
          <ThemedText type="section">Contact</ThemedText>
          <ExternalLink href={CONTACT_URL}>
            <ThemedText type="link">{CONTACT_URL}</ThemedText>
          </ExternalLink>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  lede: {
    maxWidth: 520,
  },
  section: {
    gap: Spacing.two,
  },
});
