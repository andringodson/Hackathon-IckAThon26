import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** The STILL mark: a small stone resting on a level line. Pause, balance, nothing moving. */
export function Mark({ size = 28 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={24} cy={22} r={7} fill={colors.text} />
      <Line x1={8} y1={33} x2={40} y2={33} stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Still" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Mark size={size + 4} />
      <Text variant="title" style={{ fontSize: size, lineHeight: size + 4, letterSpacing: size * 0.18 }}>
        STILL
      </Text>
    </View>
  );
}
