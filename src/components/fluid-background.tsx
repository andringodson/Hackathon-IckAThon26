import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, Path } from 'react-native-svg';

import { useTheme } from '@/theme/theme';

/** A low-contrast, liquid-like backdrop that keeps content readable. */
export function FluidBackground() {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#05070d' : '#f7f8fb' }]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Filter id="blur" x="-30%" y="-30%" width="160%" height="160%">
            <FeGaussianBlur stdDeviation="28" />
          </Filter>
        </Defs>
        <Path d="M-40 230 C70 110 140 170 210 100 C290 20 390 80 450 0 L450 340 C350 290 280 390 180 350 C90 315 30 360 -40 320 Z" fill={dark ? '#243b78' : '#b7c9f2'} opacity={dark ? 0.58 : 0.35} filter="url(#blur)" />
        <Path d="M-30 760 C80 650 150 700 235 620 C320 540 390 620 440 570 L440 940 L-30 940 Z" fill={dark ? '#4b1f56' : '#d8bde7'} opacity={dark ? 0.42 : 0.28} filter="url(#blur)" />
      </Svg>
    </View>
  );
}
