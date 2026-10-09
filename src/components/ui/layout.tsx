import { useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme';
import { hairline, motion, radius, space } from '@/theme/tokens';

import { Text } from './text';

export const TAB_BAR_HEIGHT = 64;

export function Screen({
  children,
  tabs,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  tabs?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + space.lg,
    paddingBottom: (tabs ? TAB_BAR_HEIGHT : 0) + insets.bottom + space.xxl,
  };
  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.content, padding, contentStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Card({ style, children, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} {...props}>
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text variant="caption" tone="faint">
        {children}
      </Text>
    </View>
  );
}

export function Rule() {
  const { colors } = useTheme();
  return <View style={{ height: hairline, backgroundColor: colors.border }} />;
}

/**
 * Fades content in with a small lift on mount. Animates only opacity and transform, so it never
 * shifts layout, and it is skipped entirely when Reduce Motion is on.
 */
export function FadeIn({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) {
      shown.set(withDelay(index * motion.staggerMs, withTiming(1, { duration: motion.enterMs, easing: motion.easeOut })));
    }
  }, [index, reduceMotion, shown]);
  const animated = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * motion.enterOffset }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Thin progress line. `value` is 0..1. */
export function Meter({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.meter, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.meterFill, { width: `${clamped * 100}%`, backgroundColor: colors.accent }]} />
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.xl, gap: space.xl },
  card: { borderWidth: hairline, borderRadius: radius.lg, padding: space.xl, gap: space.md },
  sectionLabel: { marginBottom: -space.sm },
  meter: { height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
