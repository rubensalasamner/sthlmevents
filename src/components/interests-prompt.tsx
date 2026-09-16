import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPill } from '@/components/category-pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useInterests } from '@/context/interests-context';
import {
  INTEREST_CATEGORIES,
  type InterestCategory,
} from '@/data/interests-storage';
import { useTheme } from '@/hooks/use-theme';
import { formatCategory } from '@/utils/format';

/**
 * Progressive interests sheet: one screen, skip-able. Draft chips are local
 * until Save — so cancelling mid-edit doesn't clobber a previous selection.
 */
export function InterestsPrompt() {
  const {
    editorOpen,
    categories,
    onboarding,
    closeEditor,
    saveInterests,
    skipOnboarding,
  } = useInterests();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Set<InterestCategory>>(() => new Set(categories));

  useEffect(() => {
    if (editorOpen) setDraft(new Set(categories));
  }, [editorOpen, categories]);

  const isFirstPrompt = onboarding === 'pending';

  const toggle = (category: InterestCategory) => {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <Modal
      visible={editorOpen}
      animationType="slide"
      transparent
      onRequestClose={isFirstPrompt ? skipOnboarding : closeEditor}
      statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={isFirstPrompt ? skipOnboarding : closeEditor}
          accessibilityLabel="Dismiss"
        />
        <ThemedView
          type="backgroundElement"
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.four) }]}>
          <View style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            {isFirstPrompt ? 'What are you into?' : 'Your vibes'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {isFirstPrompt
              ? 'We’ll gently boost these in your feed. Skip anytime — you can change this later.'
              : 'Boost these categories in Discover. Not a hard filter.'}
          </ThemedText>

          <View style={styles.chipWrap}>
            {INTEREST_CATEGORIES.map((category) => (
              <CategoryPill
                key={category}
                label={formatCategory(category)}
                selected={draft.has(category)}
                onPress={() => toggle(category)}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => saveInterests([...draft])}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.accentInk }}>
                {draft.size === 0 ? 'Save' : 'Save preferences'}
              </ThemedText>
            </Pressable>
            {isFirstPrompt ? (
              <Pressable
                accessibilityRole="button"
                onPress={skipOnboarding}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Not now
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={closeEditor}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  primary: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
