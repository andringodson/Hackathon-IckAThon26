import type { ReactNode } from 'react';
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
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated';
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

/** Fades content in with a small lift. Skipped automatically when Reduce Motion is on. */
export function FadeIn({ index = 0, style, children }: { index?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const entering = new Keyframe({
    0: { opacity: 0, transform: [{ translateY: motion.enterOffset }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: motion.easeOut },
  })
    .duration(motion.enterMs)
    .delay(index * motion.staggerMs)
    .reduceMotion(ReduceMotion.System);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
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
