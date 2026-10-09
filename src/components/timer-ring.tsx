import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';

export function TimerRing({ progress, label, caption, size = 260 }: { progress: number; label: string; caption: string; size?: number }) {
  const { colors } = useTheme();
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${label} ${caption}`}
      style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="numeral" style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
      <Text variant="small" tone="muted">
        {caption}
      </Text>
    </View>
  );
}
