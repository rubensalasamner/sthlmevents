import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const LAST_UPDATED = '13 November 2026';
const CONTACT_URL = 'https://github.com/rubensalasamner/sthlmevents/issues';

type SectionProps = {
  title: string;
  children: string;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="section">{title}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        {children}
      </ThemedText>
    </View>
  );
}

/**
 * Public privacy policy for the Play / App Store listing and in-app reference.
 * Hosted on the Vercel web export at `/privacy`.
 */
export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.five },
        ]}
      >
        <ThemedText type="display">Privacy Policy</ThemedText>
        <ThemedText type="meta" themeColor="textSecondary" style={styles.updated}>
          Last updated: {LAST_UPDATED}
        </ThemedText>

        <Section title="Who we are">
          sthlmevents (“the App”) is a Stockholm events discovery app for iOS, Android, and the
          web. This policy explains what information the App uses and how it is handled.
        </Section>

        <Section title="No accounts">
          The App does not require sign-in and does not create user accounts. We do not operate a
          user database of personal profiles.
        </Section>

        <Section title="Information stored on your device">
          Favorites, saved event snapshots, interest preferences, and on-device ranking signals are
          stored locally on your device (for example via AsyncStorage). This data stays on your
          device unless you clear the App’s storage or uninstall it. We do not upload that local
          data to our servers.
        </Section>

        <Section title="Location">
          If you choose “Near me” or similar features, the App may request your approximate or
          precise location to sort and show events near you. Location is requested only when you
          use those features, is processed on your device, and is not sent to us for storage or
          profiling. You can deny or revoke location permission in system settings.
        </Section>

        <Section title="Notifications">
          If you allow notifications, the App schedules local reminders for events you favourite
          (for example the day before and shortly before start). Reminder scheduling uses the
          device notification system. We do not send marketing push campaigns from our own servers.
        </Section>

        <Section title="Calendar">
          If you use “Add to calendar”, the App may write an event into your device calendar with
          your permission. We do not read your full calendar to build a profile.
        </Section>

        <Section title="Event content and maps">
          Event listings are aggregated from public third-party sources and served as a JSON
          snapshot from our hosting (for example Vercel and/or Cloudflare R2). Map views may use
          Apple Maps (iOS) or Google Maps (Android and web), which are subject to those providers’
          own terms and privacy policies. Opening ticket or organizer links leaves the App and is
          governed by that site’s policy.
        </Section>

        <Section title="Analytics and advertising">
          The App does not include a third-party advertising SDK. We do not sell personal
          information. Standard platform and hosting logs (for example when your device fetches the
          public event snapshot) may record technical request data such as IP address and user
          agent, as with any website or CDN.
        </Section>

        <Section title="Children">
          The App is not directed at children under 13. We do not knowingly collect personal
          information from children.
        </Section>

        <Section title="Changes">
          We may update this policy when the App’s practices change. The “Last updated” date at
          the top will change when we do. Continued use of the App after an update means you
          accept the revised policy.
        </Section>

        <View style={styles.section}>
          <ThemedText type="section">Contact</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Questions about this policy:{' '}
          </ThemedText>
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
    gap: Spacing.three,
  },
  updated: {
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
});
