import type { ComponentType } from 'react';
import { StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/theme';
import { hairline, radius, space, touchTarget, type } from '@/theme/tokens';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export function Chip({
  label,
  selected,
  onPress,
  multi,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : 'transparent',
          borderColor: selected ? colors.accent : colors.borderStrong,
        },
      ]}>
      <Text variant="small" style={{ color: selected ? colors.onAccent : colors.text, fontWeight: '500' }}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.wrap}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function MultiChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <Chip
            key={o.value}
            multi
            label={o.label}
            selected={on}
            onPress={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          />
        );
      })}
    </View>
  );
}

export function Field({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="small" tone="muted" nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={`${label}-label`}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        style={[
          styles.input,
          type.body,
          { color: colors.text, borderColor: error ? colors.danger : colors.borderStrong, backgroundColor: colors.surface },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text>{label}</Text>
        {detail ? (
          <Text variant="small" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.surfaceMuted }}
        thumbColor={value ? colors.onAccent : colors.borderStrong}
        ios_backgroundColor={colors.surfaceMuted}
      />
    </View>
  );
}

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export function IconButton({ icon: Icon, label, onPress }: { icon: IconType; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon size={22} color={colors.text} strokeWidth={1.75} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: hairline,
    justifyContent: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: { gap: space.xs },
  input: { minHeight: touchTarget + 4, borderWidth: hairline, borderRadius: radius.md, paddingHorizontal: space.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: touchTarget },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
});
