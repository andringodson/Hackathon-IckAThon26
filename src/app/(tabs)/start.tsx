import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, Compass, Pause, Play, RotateCcw } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { AppState, View } from 'react-native';

import { clearActive, hasProgress, loadActive, newActive, saveActive, type ActiveSession } from '@/application/active-session';
import { useActions, useStore } from '@/application/store';
import { HobbyRow } from '@/components/hobby';
import { TimerRing } from '@/components/timer-ring';
import { Button } from '@/components/ui/button';
import { ChipGroup, Field } from '@/components/ui/controls';
import { Card, FadeIn, Screen, SectionLabel, styles as layout } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { HOBBIES } from '@/domain/catalog';
import { formatMinutes } from '@/domain/dates';
import { localRecommendations } from '@/domain/ranking';
import { completeSession, MAX_REFLECTION } from '@/domain/sessions';
import { createTimer, elapsedMs, finishesAt, formatClock, pause, reset, start } from '@/domain/timer';
import type { Hobby, HobbySession } from '@/domain/types';
import { cancelTimerDone, scheduleTimerDone } from '@/infrastructure/notifications';
import { useTheme } from '@/theme/theme';
import { hairline, radius, space } from '@/theme/tokens';

const DURATIONS = [5, 10, 15, 30].map((m) => ({ value: m, label: `${m} min` }));

export default function Start() {
  const { snapshot } = useStore();
  const hobby = HOBBIES.find((h) => h.id === snapshot.currentHobbyId);
  return hobby ? <Activity key={hobby.id} hobby={hobby} /> : <Picker />;
}

function Picker() {
  const { snapshot } = useStore();
  const actions = useActions();
  const options = useMemo(() => {
    const saved = HOBBIES.filter((h) => snapshot.savedHobbyIds.includes(h.id));
    const suggested = localRecommendations(HOBBIES, snapshot.preferences).map((r) => r.hobby);
    return [...saved, ...suggested.filter((h) => !saved.includes(h))];
  }, [snapshot.savedHobbyIds, snapshot.preferences]);

  return (
    <Screen tabs>
      <View style={{ gap: space.sm }}>
        <Text variant="display">Start</Text>
        <Text tone="muted">Pick something for the next fifteen minutes.</Text>
      </View>
      <View>
        {options.map((h) => (
          <HobbyRow key={h.id} hobby={h} onPress={() => actions.setCurrentHobby(h.id)} />
        ))}
      </View>
      <Button variant="secondary" label="Find something new" icon={Compass} onPress={() => router.navigate('/discover')} />
    </Screen>
  );
}

function Activity({ hobby }: { hobby: Hobby }) {
  const { snapshot } = useStore();
  const actions = useActions();
  const { colors } = useTheme();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [other, setOther] = useState<ActiveSession | null>(null);
  const [now, setNow] = useState(Date.now);
  const [phase, setPhase] = useState<'timer' | 'reflect' | 'saved'>('timer');
  const [reflection, setReflection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<HobbySession | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    loadActive().then((stored) => {
      if (!alive) return;
      if (stored?.hobbyId === hobby.id) setActive(stored);
      else {
        if (stored && hasProgress(stored)) setOther(stored);
        setActive(newActive(hobby.id, Math.min(15, snapshot.preferences.availableMinutes)));
      }
      setNow(Date.now());
    });
    return () => {
      alive = false;
    };
    // Restores once per hobby; preferences changing later must not reset a running timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hobby.id]);

  const timer = active?.timer;
  const elapsed = timer ? elapsedMs(timer, now) : 0;
  const running = timer?.status === 'running';
  const finished = !!timer && (timer.status === 'finished' || (running && elapsed >= timer.targetMs));

  // Recomputed from timestamps on every tick, so throttled timers or backgrounding never drift.
  useEffect(() => {
    if (!running || finished) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [running, finished]);

  useEffect(() => {
    if (finished) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [finished]);

  if (!active || !timer) return <Screen tabs>{null}</Screen>;

  const update = (next: ActiveSession) => {
    setActive(next);
    void saveActive(next);
  };

  const onStart = () => {
    const t = Date.now();
    const next = { ...active, startedAt: active.startedAt ?? t, timer: start(timer, t) };
    update(next);
    setNow(t);
    const at = finishesAt(next.timer, t);
    if (at) void scheduleTimerDone(at, hobby.title);
  };
  const onPause = () => {
    update({ ...active, timer: pause(timer, Date.now()) });
    void cancelTimerDone();
  };
  const onReset = () => {
    update({ ...active, startedAt: null, timer: reset(timer), checked: [] });
    setNow(Date.now());
    void cancelTimerDone();
  };
  const onDone = () => {
    const t = Date.now();
    update({ ...active, timer: pause(timer, t) });
    setNow(t);
    setError(null);
    setPhase('reflect');
    void cancelTimerDone();
  };
  const onSave = () => {
    if (saving) return;
    setSaving(true);
    const t = Date.now();
    const result = completeSession({
      id: active.id,
      hobby,
      timer,
      startedAt: active.startedAt ?? t,
      now: t,
      reflection,
      existing: snapshot.sessions,
    });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    actions.addSession(result.value);
    void clearActive();
    setSaved(result.value);
    setPhase('saved');
    setSaving(false);
  };
  const again = () => {
    setActive(newActive(hobby.id, timer.targetMs / 60_000));
    setReflection('');
    setSaved(null);
    setPhase('timer');
  };

  if (phase === 'saved' && saved) {
    return (
      <Screen tabs contentStyle={{ justifyContent: 'center', flexGrow: 1 }}>
        <FadeIn style={{ gap: space.lg }}>
          <Text variant="display">Saved.</Text>
          <Text variant="title" tone="muted">
            {formatMinutes(saved.durationMinutes)} of {hobby.title.toLowerCase()}.
          </Text>
          <Text tone="muted">A small start still counts. Your progress is updated.</Text>
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <Button label="See progress" onPress={() => router.navigate('/progress')} />
            <Button variant="secondary" label="Another round" icon={RotateCcw} onPress={again} />
          </View>
        </FadeIn>
      </Screen>
    );
  }

  if (phase === 'reflect') {
    return (
      <Screen tabs>
        <FadeIn style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <Text variant="display">Nice.</Text>
            <Text tone="muted">
              {formatMinutes(Math.floor(elapsed / 60_000))} of {hobby.title.toLowerCase()}. Anything you noticed? Only you can see
              this.
            </Text>
          </View>
          <Field
            label="Reflection (optional)"
            placeholder="It felt good to…"
            value={reflection}
            onChangeText={setReflection}
            multiline
            maxLength={MAX_REFLECTION}
            style={{ minHeight: 120, paddingTop: space.md, textAlignVertical: 'top' }}
            error={error ?? undefined}
          />
          <View style={{ gap: space.sm }}>
            <Button label="Save session" icon={Check} loading={saving} onPress={onSave} />
            <Button variant="quiet" label="Back to the timer" onPress={() => setPhase('timer')} />
          </View>
        </FadeIn>
      </Screen>
    );
  }

  const idle = timer.status === 'idle';
  const caption = finished ? 'Done. Take a breath.' : running ? 'remaining' : idle ? 'ready when you are' : 'paused';

  return (
    <Screen tabs>
      {other ? (
        <Card>
          <Text variant="heading">You have {HOBBIES.find((h) => h.id === other.hobbyId)?.title ?? 'a session'} in progress</Text>
          <Text tone="muted">Starting this one will set that aside.</Text>
          <View style={[layout.row, { flexWrap: 'wrap' }]}>
            <Button variant="secondary" label="Go back to it" onPress={() => actions.setCurrentHobby(other.hobbyId)} />
            <Button
              variant="quiet"
              label="Set it aside"
              onPress={() => {
                setOther(null);
                void cancelTimerDone();
                void clearActive();
              }}
            />
          </View>
        </Card>
      ) : null}

      <View style={{ gap: space.xs }}>
        <View style={layout.between}>
          <Text variant="caption" tone="faint">
            Now
          </Text>
          {idle && !active.startedAt ? (
            <Button variant="quiet" label="Change" onPress={() => actions.setCurrentHobby(null)} style={{ minHeight: 36, paddingHorizontal: 0 }} />
          ) : null}
        </View>
        <Text variant="title">{hobby.title}</Text>
        <Text tone="muted">{hobby.starter.title}.</Text>
      </View>

      <TimerRing
        progress={elapsed / timer.targetMs}
        label={formatClock(timer.targetMs - elapsed)}
        caption={caption}
        size={240}
      />

      {idle ? (
        <View style={{ alignItems: 'center' }}>
          <ChipGroup
            options={DURATIONS}
            value={timer.targetMs / 60_000}
            onChange={(m) => update({ ...active, timer: createTimer(m) })}
          />
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        {finished ? null : running ? (
          <Button label="Pause" icon={Pause} onPress={onPause} />
        ) : (
          <Button label={idle ? 'Start' : 'Resume'} icon={Play} onPress={onStart} />
        )}
        {!idle ? (
          <Button
            variant={finished ? 'primary' : 'secondary'}
            label="I did it"
            icon={Check}
            disabled={elapsed < 60_000}
            accessibilityHint={elapsed < 60_000 ? 'Available after one minute' : undefined}
            onPress={onDone}
          />
        ) : null}
        {!idle ? <Button variant="quiet" label="Start over" icon={RotateCcw} onPress={onReset} /> : null}
      </View>

      <View>
        <SectionLabel>Checklist</SectionLabel>
        <View style={{ marginTop: space.md }}>
          {hobby.starter.steps.map((step, i) => {
            const done = active.checked.includes(i);
            return (
              <PressableScale
                key={step}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={step}
                onPress={() =>
                  update({ ...active, checked: done ? active.checked.filter((c) => c !== i) : [...active.checked, i] })
                }
                style={[layout.row, { paddingVertical: space.md, borderBottomWidth: hairline, borderColor: colors.border }]}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radius.sm,
                    borderWidth: 1.5,
                    borderColor: done ? colors.accent : colors.borderStrong,
                    backgroundColor: done ? colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {done ? <Check size={14} color={colors.onAccent} strokeWidth={2.5} /> : null}
                </View>
                <Text style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }} tone={done ? 'faint' : 'default'}>
                  {step}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
