import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

/** Scales to 0.97 on press so every tap gets instant feedback. Reduced motion dims instead of scaling. */
export function PressableScale({ style, haptic, onPressIn, onPressOut, onPress, disabled, ...props }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.3 }
      : { transform: [{ scale: 1 - pressed.value * (1 - motion.pressScale) }] },
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: motion.pressMs, easing: motion.easeOut });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: motion.pressMs * 1.5, easing: motion.easeOut });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, animated, disabled && { opacity: 0.4 }]}
      {...props}
    />
  );
}
