import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const COLLAPSED_LINES = 8;

type ExpandableTextProps = {
  children: string;
  /** Lines shown before "Read more". */
  collapsedLines?: number;
};

/**
 * Long copy clamped with Read more / Show less. Measures full line count once,
 * then collapses only when the text actually exceeds the budget.
 */
export function ExpandableText({
  children,
  collapsedLines = COLLAPSED_LINES,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);
  const [overflows, setOverflows] = useState(false);

  return (
    <View style={styles.wrap}>
      <ThemedText
        type="default"
        numberOfLines={measured && !expanded && overflows ? collapsedLines : undefined}
        onTextLayout={(event) => {
          if (measured) return;
          setOverflows(event.nativeEvent.lines.length > collapsedLines);
          setMeasured(true);
        }}>
        {children}
      </ThemedText>
      {overflows ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less' : 'Read more'}
          onPress={() => setExpanded((open) => !open)}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="link">
            {expanded ? 'Show less' : 'Read more'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
