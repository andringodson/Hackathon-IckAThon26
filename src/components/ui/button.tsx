import type { ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { hairline, radius, space, touchTarget } from '@/theme/tokens';

import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export function Button({
  label,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  style,
  ...props
}: PressableScaleProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: IconType;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const look = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.borderStrong },
    quiet: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.border },
  }[variant];

  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      haptic={variant === 'primary'}
      style={[styles.base, { backgroundColor: look.bg, borderColor: look.border }, style]}
      {...props}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={look.fg} size="small" />
        ) : (
          Icon && <Icon size={18} color={look.fg} strokeWidth={1.75} />
        )}
        <Text variant="heading" style={{ color: look.fg, fontSize: 16 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 8,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: hairline,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
