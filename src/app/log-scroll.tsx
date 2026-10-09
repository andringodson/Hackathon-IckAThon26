import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActions, useStore } from '@/application/store';
import { useToday } from '@/application/use-today';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { addDays, formatDay } from '@/domain/dates';
import { validateScrollEntry } from '@/domain/sessions';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

const QUICK = [15, 30, 60, 90, 120, 180].map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60}h` }));

export default function LogScroll() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { snapshot } = useStore();
  const actions = useActions();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const existing = snapshot.scrollLogs.find((l) => l.id === id);

  const [day, setDay] = useState(existing?.dateKey ?? today);
  const [minutes, setMinutes] = useState(existing ? String(existing.minutes) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const days = [0, 1, 2, 3, 4, 5, 6].map((n) => {
    const key = addDays(today, -n);
    return { value: key, label: n === 0 ? 'Today' : n === 1 ? 'Yesterday' : formatDay(key) };
  });
  if (existing && !days.some((d) => d.value === existing.dateKey)) {
    days.push({ value: existing.dateKey, label: formatDay(existing.dateKey) });
  }

  const save = () => {
    const result = validateScrollEntry({ minutes, dateKey: day, todayKey: today });
    if (!result.ok) return setError(result.error);
    actions.saveScrollLog({
      id: existing?.id ?? randomUUID(),
      dateKey: result.value.dateKey,
      minutes: result.value.minutes,
      source: 'manual',
      note: note.trim().slice(0, 200),
      createdAt: existing?.createdAt ?? Date.now(),
    });
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete this entry?', 'It will no longer count towards your estimate.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          actions.deleteScrollLog(existing!.id);
          router.back();
        },
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.xl }}
      keyboardShouldPersistTaps="handled">
      <View style={{ gap: space.sm }}>
        <Text variant="title">{existing ? 'Edit entry' : 'Log scrolling'}</Text>
        <Text tone="muted">
          Roughly how long did you scroll without meaning to? Your phone's screen-time page helps. A guess is fine.
        </Text>
      </View>
      <ChipGroup options={days} value={day} onChange={setDay} />
      <Field
        label="Minutes"
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="e.g. 90"
        value={minutes}
        onChangeText={(v) => {
          setMinutes(v);
          setError(null);
        }}
        maxLength={4}
        error={error ?? undefined}
      />
      <ChipGroup options={QUICK} value={minutes} onChange={setMinutes} />
      <Field label="Note (optional)" placeholder="Late night, mostly short videos" value={note} onChangeText={setNote} maxLength={200} />
      <View style={{ gap: space.sm }}>
        <Button label="Save" onPress={save} />
        {existing ? <Button variant="danger" label="Delete entry" onPress={remove} /> : null}
        <Button variant="quiet" label="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
