import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ChevronLeft, Download, LogOut, Trash } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Share, View } from 'react-native';

import { useActions, useStore } from '@/application/store';
import { BASELINE_OPTIONS, REMINDER_OPTIONS } from '@/components/quiz';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field, IconButton, MultiChipGroup, ToggleRow } from '@/components/ui/controls';
import { Card, Screen, SectionLabel, styles as layout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { hasPermission, requestPermission } from '@/infrastructure/notifications';
import { supabase } from '@/infrastructure/supabase';
import { space } from '@/theme/tokens';

const GOALS = [5, 10, 15, 30, 45, 60].map((m) => ({ value: m, label: `${m} min` }));
const THEMES = [
  { value: 'system', label: 'Match phone' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function Settings() {
  const { snapshot, account } = useStore();
  const actions = useActions();
  const p = snapshot.preferences;
  const [name, setName] = useState(p.name);
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasPermission().then(setNotificationsAllowed, () => setNotificationsAllowed(false));
  }, []);

  async function setReminders(on: boolean) {
    if (!on) return actions.updatePreferences({ remindersOn: false });
    const granted = await requestPermission();
    setNotificationsAllowed(granted);
    if (!granted) {
      Alert.alert('Notifications are off', 'Allow notifications for STILL in your phone settings to get gentle nudges.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    actions.updatePreferences({
      remindersOn: true,
      reminderTimes: p.reminderTimes.length ? p.reminderTimes : ['19:00'],
    });
  }

  function exportData() {
    const { outbox: _outbox, ...data } = snapshot;
    void Share.share({ title: 'My STILL data', message: JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2) }).catch(
      () => {},
    );
  }

  function deleteAll() {
    Alert.alert(
      'Delete all your data?',
      account
        ? 'This removes your sessions, logs and preferences from this phone and from your account. It cannot be undone.'
        : 'This removes your sessions, logs and preferences from this phone. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await actions.resetEverything();
            } catch {
              Alert.alert("Couldn't reach the server", 'Nothing was deleted. Try again when you are online.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  async function signOut() {
    const pending = await actions.signOut();
    if (pending) {
      Alert.alert(
        'Some changes have not synced',
        `${pending} recent ${pending === 1 ? 'change has' : 'changes have'} not reached your account yet. Signing out now will lose ${pending === 1 ? 'it' : 'them'}.`,
        [
          { text: 'Stay signed in', style: 'cancel' },
          { text: 'Sign out anyway', style: 'destructive', onPress: () => void actions.signOut(true) },
        ],
      );
    }
  }

  return (
    <Screen>
      <View style={[layout.row, { marginLeft: -space.md }]}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <Text variant="title">You</Text>
      </View>

      <Card>
        <SectionLabel>Profile</SectionLabel>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          onEndEditing={() => actions.updatePreferences({ name: name.trim() })}
          maxLength={40}
        />
        {supabase ? (
          account ? (
            <View style={{ gap: space.sm }}>
              <Text tone="muted">Signed in as {account.email}</Text>
              <Button variant="secondary" label="Sign out" icon={LogOut} onPress={signOut} />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Text tone="muted">You're a guest. An account backs up your progress and lets you add friends.</Text>
              <Button variant="secondary" label="Sign in or create an account" onPress={() => router.push('/auth')} />
            </View>
          )
        ) : (
          <Text variant="small" tone="faint">
            Accounts are off in this build, so everything stays on this phone.
          </Text>
        )}
      </Card>

      <Card>
        <SectionLabel>Daily hobby goal</SectionLabel>
        <ChipGroup options={GOALS} value={p.dailyGoalMinutes} onChange={(dailyGoalMinutes) => actions.updatePreferences({ dailyGoalMinutes })} />
        <Text variant="small" tone="faint">
          Small and repeatable beats big and rare.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Your usual scrolling</SectionLabel>
        <ChipGroup
          options={[...BASELINE_OPTIONS, { value: -1, label: 'Not sure' }]}
          value={p.baselineDailyMinutes ?? -1}
          onChange={(v) => actions.updatePreferences({ baselineDailyMinutes: v === -1 ? null : v })}
        />
        <Text variant="small" tone="faint">
          How estimates work: on each day you log, STILL compares what you entered with this usual amount, and adds up the
          difference for the current week. Days you don't log are left out, not counted as zero. Hobby minutes are never
          added to it. It is only as accurate as the numbers you give it.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Reminders</SectionLabel>
        <ToggleRow
          label="Gentle nudges"
          detail={
            notificationsAllowed === false && p.remindersOn
              ? 'Notifications are blocked in your phone settings.'
              : '"Try ten minutes of your hobby instead?" at the times you choose.'
          }
          value={p.remindersOn}
          onChange={(on) => void setReminders(on)}
        />
        {p.remindersOn ? (
          <MultiChipGroup
            options={REMINDER_OPTIONS}
            value={p.reminderTimes}
            onChange={(reminderTimes) => actions.updatePreferences({ reminderTimes, remindersOn: reminderTimes.length > 0 })}
          />
        ) : null}
      </Card>

      <Card>
        <SectionLabel>Appearance</SectionLabel>
        <ChipGroup options={THEMES} value={p.theme} onChange={(theme) => actions.updatePreferences({ theme })} />
        <Text variant="small" tone="faint">
          Dark mode uses true black, which saves battery on OLED screens.
        </Text>
      </Card>

      <Card>
        <SectionLabel>Privacy</SectionLabel>
        <ToggleRow
          label="Privacy mode"
          detail="Hides scrolling numbers on every screen."
          value={p.privacyMode}
          onChange={(privacyMode) => actions.updatePreferences({ privacyMode })}
        />
        {supabase ? (
          <ToggleRow
            label="AI coach"
            detail="When on, your quiz answers (not your name or screen time) go to Google Gemini to write suggestions."
            value={p.aiConsent}
            onChange={(aiConsent) => actions.updatePreferences({ aiConsent })}
          />
        ) : null}
      </Card>

      <Card>
        <SectionLabel>Your data</SectionLabel>
        <Button variant="secondary" label="Export my data" icon={Download} onPress={exportData} />
        <Button variant="danger" label="Delete all my data" icon={Trash} loading={busy} onPress={deleteAll} />
      </Card>

      <Text variant="small" tone="faint" style={{ textAlign: 'center' }}>
        STILL {Constants.expoConfig?.version ?? ''} · Less scrolling. More living.
      </Text>
    </Screen>
  );
}
