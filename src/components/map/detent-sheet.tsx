/* Reanimated shared values are mutated by design; the React Compiler lint
 * treats `.value =` as forbidden immutability. */
/* eslint-disable react-hooks/immutability */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetDetent = 'peek' | 'half' | 'full';

export type DetentSheetHandle = {
  snapTo: (detent: SheetDetent) => void;
};

type DetentSheetProps = {
  ref?: Ref<DetentSheetHandle>;
  /** Peek height in px above the home-indicator / tab-bar padding. */
  peekHeight?: number;
  halfFraction?: number;
  fullFraction?: number;
  /** Extra bottom padding so content clears the tab bar. */
  bottomInset?: number;
  onDetentChange?: (detent: SheetDetent) => void;
  header: ReactNode;
  children: (opts: { scrollEnabled: boolean; detent: SheetDetent }) => ReactNode;
};

const SPRING = { damping: 28, stiffness: 220, mass: 0.9 };

function nearestDetent(height: number, peek: number, half: number, full: number): SheetDetent {
  'worklet';
  const midPeekHalf = (peek + half) / 2;
  const midHalfFull = (half + full) / 2;
  if (height < midPeekHalf) return 'peek';
  if (height < midHalfFull) return 'half';
  return 'full';
}

function heightFor(detent: SheetDetent, peek: number, half: number, full: number): number {
  'worklet';
  if (detent === 'peek') return peek;
  if (detent === 'half') return half;
  return full;
}

/**
 * Bottom sheet with three snap heights. The header (handle + title) owns the
 * pan; list scrolling unlocks at half/full so gestures don't fight.
 */
export function DetentSheet({
  ref,
  peekHeight = 132,
  halfFraction = 0.45,
  fullFraction = 0.88,
  bottomInset = 0,
  onDetentChange,
  header,
  children,
}: DetentSheetProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [detent, setDetent] = useState<SheetDetent>('peek');

  const peek = peekHeight + Math.max(insets.bottom, Spacing.two) + bottomInset;
  const half = Math.round(windowHeight * halfFraction);
  const full = Math.round(windowHeight * fullFraction);

  const sheetHeight = useSharedValue(peek);
  const dragStart = useSharedValue(peek);
  const detentRef = useRef(detent);

  useEffect(() => {
    detentRef.current = detent;
  }, [detent]);

  const commitDetent = useCallback(
    (next: SheetDetent) => {
      setDetent(next);
      onDetentChange?.(next);
    },
    [onDetentChange],
  );

  const snapTo = useCallback(
    (next: SheetDetent) => {
      sheetHeight.value = withSpring(heightFor(next, peek, half, full), SPRING);
      commitDetent(next);
    },
    [commitDetent, sheetHeight, peek, half, full],
  );

  // Retarget height when the window / insets change; pan/snap already spring.
  useEffect(() => {
    sheetHeight.value = withSpring(heightFor(detentRef.current, peek, half, full), SPRING);
  }, [peek, half, full, sheetHeight]);

  useImperativeHandle(ref, () => ({ snapTo }), [snapTo]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          dragStart.value = sheetHeight.value;
        })
        .onUpdate((event) => {
          const next = Math.min(full, Math.max(peek, dragStart.value - event.translationY));
          sheetHeight.value = next;
        })
        .onEnd((event) => {
          const projected = sheetHeight.value - event.velocityY * 0.12;
          const next = nearestDetent(projected, peek, half, full);
          sheetHeight.value = withSpring(heightFor(next, peek, half, full), SPRING);
          runOnJS(commitDetent)(next);
        }),
    [commitDetent, dragStart, sheetHeight, peek, half, full],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundElement,
        },
        sheetStyle,
      ]}
      pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <View style={styles.header}>{header}</View>
      </GestureDetector>
      <View style={styles.body}>{children({ scrollEnabled: detent !== 'peek', detent })}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    paddingTop: Spacing.two,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});
