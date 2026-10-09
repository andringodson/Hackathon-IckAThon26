import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useActions, useStore } from '@/application/store';
import { BASELINE_OPTIONS, INTEREST_OPTIONS, REMINDER_OPTIONS, TIME_OPTIONS } from '@/components/quiz';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field, MultiChipGroup } from '@/components/ui/controls';
import { FadeIn, Meter, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import type { Preferences } from '@/domain/types';
import { requestPermission } from '@/infrastructure/notifications';
import { space } from '@/theme/tokens';

type Draft = Pick<
  Preferences,
  'name' | 'interests' | 'availableMinutes' | 'budget' | 'company' | 'skill' | 'baselineDailyMinutes' | 'reminderTimes'
>;

interface Step {
  title: string;
  body?: string;
  render(d: Draft, set: (p: Partial<Draft>) => void): ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'What should we call you?',
    body: 'Just a first name. You can skip this.',
    render: (d, set) => (
      <Field label="Name" value={d.name} onChangeText={(name) => set({ name })} maxLength={40} autoComplete="given-name" returnKeyType="next" />
    ),
  },
  {
    title: 'What do you enjoy, even a little?',
    body: 'Pick as many as you like.',
    render: (d, set) => <MultiChipGroup options={INTEREST_OPTIONS} value={d.interests} onChange={(interests) => set({ interests })} />,
  },
  {
    title: 'How much time do you usually have?',
    body: 'The minutes you would otherwise spend scrolling.',
    render: (d, set) => (
      <ChipGroup options={TIME_OPTIONS} value={d.availableMinutes} onChange={(availableMinutes) => set({ availableMinutes })} />
    ),
  },
  {
    title: 'Budget?',
    render: (d, set) => (
      <ChipGroup
        options={[
          { value: 'free', label: 'Free only' },
          { value: 'low', label: 'A little is fine' },
          { value: 'flexible', label: 'Flexible' },
        ]}
        value={d.budget}
        onChange={(budget) => set({ budget })}
      />
    ),
  },
  {
    title: 'On your own, or with people?',
    render: (d, set) => (
      <ChipGroup
        options={[
          { value: 'solo', label: 'On my own' },
          { value: 'social', label: 'With people' },
          { value: 'either', label: 'Either' },
        ]}
        value={d.company}
        onChange={(company) => set({ company })}
      />
    ),
  },
  {
    title: 'New to most hobbies?',
    render: (d, set) => (
      <ChipGroup
        options={[
          { value: 'beginner', label: "Yes, I'm a beginner" },
          { value: 'experienced', label: "I've done a few" },
        ]}
        value={d.skill}
        onChange={(skill) => set({ skill })}
      />
    ),
  },
  {
    title: 'On a typical day, how long do you scroll without meaning to?',
    body: 'An honest guess. STILL uses it to estimate the time you win back. Only you see it.',
    render: (d, set) => (
      <ChipGroup
        options={BASELINE_OPTIONS}
        value={d.baselineDailyMinutes}
        onChange={(baselineDailyMinutes) => set({ baselineDailyMinutes })}
      />
    ),
  },
  {
    title: 'When do you usually reach for your phone?',
    body: 'STILL can send one gentle nudge at these times. Pick none for no reminders.',
    render: (d, set) => (
      <MultiChipGroup options={REMINDER_OPTIONS} value={d.reminderTimes} onChange={(reminderTimes) => set({ reminderTimes })} />
    ),
  },
];

export default function Onboarding() {
  const { snapshot } = useStore();
  const actions = useActions();
  const p = snapshot.preferences;
  const [i, setI] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: p.name,
    interests: p.interests,
    availableMinutes: p.availableMinutes,
    budget: p.budget,
    company: p.company,
    skill: p.skill,
    baselineDailyMinutes: p.baselineDailyMinutes,
    reminderTimes: p.reminderTimes,
  });
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  async function finish() {
    setFinishing(true);
    const remindersOn = draft.reminderTimes.length > 0 && (await requestPermission());
    actions.updatePreferences({ ...draft, name: draft.name.trim(), remindersOn, onboarded: true });
  }

  const next = () => (last ? void finish() : setI(i + 1));

  return (
    <Screen contentStyle={{ flexGrow: 1 }}>
      <View style={{ gap: space.sm }}>
        <Meter value={(i + 1) / STEPS.length} label={`Step ${i + 1} of ${STEPS.length}`} />
        <Text variant="small" tone="faint">
          {i + 1} of {STEPS.length}
        </Text>
      </View>

      <FadeIn key={i} style={{ gap: space.xl, flex: 1 }}>
        <View style={{ gap: space.sm }}>
          <Text variant="title">{step.title}</Text>
          {step.body ? <Text tone="muted">{step.body}</Text> : null}
        </View>
        {step.render(draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}
      </FadeIn>

      <View style={{ gap: space.sm }}>
        <Button label={last ? 'Done' : 'Continue'} loading={finishing} onPress={next} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button variant="quiet" label="Back" onPress={() => (i ? setI(i - 1) : router.back())} />
          {!last ? <Button variant="quiet" label="Skip" onPress={next} /> : null}
        </View>
      </View>
    </Screen>
  );
}
