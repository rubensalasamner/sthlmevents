import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 40pt round surface for icon actions floating over the hero image. */
export function CircleSurface({ children }: { children: ReactNode }) {
  return <ThemedView style={styles.circle}>{children}</ThemedView>;
}

type DetailTopBarProps = {
  onBack: () => void;
  /** Trailing actions, each wrapped in a CircleSurface. */
  children?: ReactNode;
};

/** Floating back button plus optional trailing actions, inset below the status bar. */
export function DetailTopBar({ onBack, children }: DetailTopBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
      <CircleSurface>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={Spacing.one}
          style={({ pressed }) => pressed && styles.pressed}>
          <Icon sf="chevron.left" material="arrow_back" size={20} color={theme.text} />
        </Pressable>
      </CircleSurface>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
