import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { ChartNoAxesColumn, Compass, House, Play, Users } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { TAB_BAR_HEIGHT } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { hairline, radius, space } from '@/theme/tokens';

type Icon = ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;

const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: House },
  { name: 'discover', href: '/discover', label: 'Discover', icon: Compass },
  { name: 'start', href: '/start', label: 'Start', icon: Play, center: true },
  { name: 'progress', href: '/progress', label: 'Progress', icon: ChartNoAxesColumn },
  { name: 'arena', href: '/arena', label: 'Arena', icon: Users },
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          styles.bar,
          {
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} icon={t.icon} center={'center' in t} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

function TabButton({
  label,
  icon: Icon,
  center,
  isFocused,
  ...props
}: TabTriggerSlotProps & { label: string; icon: Icon; center?: boolean }) {
  const { colors } = useTheme();
  const tint = isFocused ? colors.text : colors.textFaint;
  return (
    <PressableScale
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={styles.item}>
      {center ? (
        <View style={[styles.center, { backgroundColor: colors.accent }]}>
          <Icon size={20} color={colors.onAccent} fill={colors.onAccent} strokeWidth={1.75} />
        </View>
      ) : (
        <>
          <Icon size={22} color={tint} strokeWidth={isFocused ? 2 : 1.6} />
          <Text variant="small" style={{ color: tint, fontSize: 11, lineHeight: 14 }}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: hairline,
    paddingHorizontal: space.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxs },
  center: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
