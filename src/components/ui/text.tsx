import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/theme';
import { type as typeScale, type TypeVariant } from '@/theme/tokens';

type Tone = 'default' | 'muted' | 'faint' | 'danger' | 'positive' | 'onAccent';

export function Text({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    danger: colors.danger,
    positive: colors.positive,
    onAccent: colors.onAccent,
  }[tone];
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={variant === 'numeral' || variant === 'display' ? 1.3 : 1.8}
      {...props}
      style={[typeScale[variant], { color }, style]}
    />
  );
}
