import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { CategoryPill } from '@/components/category-pill';
import { ThemedText } from '@/components/themed-text';
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
  const [draft, setDraft] = useState<Set<InterestCategory>>(() => new Set(categories));

  useEffect(() => {
    if (editorOpen) setDraft(new Set(categories));
  }, [editorOpen, categories]);

  const isFirstPrompt = onboarding === 'pending';
  const dismiss = isFirstPrompt ? skipOnboarding : closeEditor;

  const toggle = (category: InterestCategory) => {
    setDraft((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <BottomSheet visible={editorOpen} onDismiss={dismiss} style={styles.sheet}>
      <ThemedText type="section" style={styles.title}>
        {isFirstPrompt ? 'What are you into?' : 'Your vibes'}
      </ThemedText>
      <ThemedText type="meta" themeColor="textSecondary" style={styles.subtitle}>
        {isFirstPrompt
          ? 'We’ll show more of these on Home. You can change this later.'
          : 'Shown higher on Home. Nothing is hidden.'}
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
          <ThemedText type="metaBold" style={{ color: theme.accentInk }}>
            Save
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={dismiss}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="meta" themeColor="textSecondary">
            {isFirstPrompt ? 'Not now' : 'Cancel'}
          </ThemedText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
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
