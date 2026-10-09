import { router } from 'expo-router';
import { Check, Pencil, Plus } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useStore } from '@/application/store';
import { useToday } from '@/application/use-today';
import { ReclaimedCard, WeekBars } from '@/components/progress';
import { Button } from '@/components/ui/button';
import { Card, FadeIn, Rule, Screen, SectionLabel, styles as layout } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { formatDay, formatMinutes } from '@/domain/dates';
import { estimateReclaimed, milestones, summarize } from '@/domain/progress';
import { sortLogs } from '@/domain/sessions';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: space.xxs }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="small" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function Progress() {
  const { snapshot } = useStore();
  const { colors } = useTheme();
  const today = useToday();
  const { preferences: p, sessions, scrollLogs } = snapshot;

  const summary = useMemo(() => summarize(sessions, today, p.dailyGoalMinutes), [sessions, today, p.dailyGoalMinutes]);
  const estimate = useMemo(
    () => estimateReclaimed(scrollLogs, p.baselineDailyMinutes, today),
    [scrollLogs, p.baselineDailyMinutes, today],
  );
  const recent = useMemo(() => [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 8), [sessions]);
  const logs = useMemo(() => sortLogs(scrollLogs).slice(0, 14), [scrollLogs]);

  return (
    <Screen tabs>
      <View style={{ gap: space.sm }}>
        <Text variant="display">Progress</Text>
        <Text tone="muted">
          {summary.totalSessions === 0
            ? 'Your first session will show up here.'
            : summary.streak > 1
              ? `${summary.streak} days in a row. Nice rhythm.`
              : 'Every session you save adds up here.'}
        </Text>
      </View>

      <FadeIn index={0}>
        <Card>
          <View style={layout.row}>
            <Stat value={`${summary.todayMinutes}`} label="min today" />
            <Stat value={`${summary.weekMinutes}`} label="min this week" />
            <Stat value={`${summary.weekSessions}`} label={summary.weekSessions === 1 ? 'session' : 'sessions'} />
          </View>
          <Rule />
          <WeekBars week={summary.week} goal={p.dailyGoalMinutes} />
          <Text tone="muted">
            Goal met on {summary.goalDaysThisWeek} {summary.goalDaysThisWeek === 1 ? 'day' : 'days'} this week ·{' '}
            {formatMinutes(summary.totalMinutes)} of hobbies in total.
          </Text>
        </Card>
      </FadeIn>

      <FadeIn index={1}>
        <ReclaimedCard estimate={estimate} baseline={p.baselineDailyMinutes} privacyMode={p.privacyMode} compact />
      </FadeIn>

      {!p.privacyMode ? (
        <View style={{ gap: space.md }}>
          <View style={layout.between}>
            <SectionLabel>Scrolling you have logged</SectionLabel>
            <Button
              variant="quiet"
              label="Log"
              icon={Plus}
              onPress={() => router.push('/log-scroll')}
              style={{ minHeight: 36, paddingHorizontal: 0 }}
            />
          </View>
          {logs.length ? (
            logs.map((l) => (
              <PressableScale
                key={l.id}
                accessibilityLabel={`${formatDay(l.dateKey)}, ${formatMinutes(l.minutes)}. Edit`}
                onPress={() => router.push({ pathname: '/log-scroll', params: { id: l.id } })}
                style={[layout.between, { paddingVertical: space.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text>{formatDay(l.dateKey)}</Text>
                  {l.note ? (
                    <Text variant="small" tone="muted" numberOfLines={1}>
                      {l.note}
                    </Text>
                  ) : null}
                </View>
                <Text tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatMinutes(l.minutes)}
                </Text>
                <Pencil size={16} color={colors.textFaint} strokeWidth={1.75} />
              </PressableScale>
            ))
          ) : (
            <Text tone="muted">Nothing logged yet. A rough guess from your phone's screen-time page is enough.</Text>
          )}
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionLabel>Milestones</SectionLabel>
        {milestones(summary).map((m) => (
          <View key={m.id} style={layout.row} accessible accessibilityLabel={`${m.title}, ${m.reached ? 'reached' : 'not yet'}`}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: m.reached ? colors.accent : colors.border,
                backgroundColor: m.reached ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {m.reached ? <Check size={12} color={colors.onAccent} strokeWidth={3} /> : null}
            </View>
            <Text tone={m.reached ? 'default' : 'faint'}>{m.title}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: space.md }}>
        <SectionLabel>Recent sessions</SectionLabel>
        {recent.length ? (
          recent.map((s) => (
            <View key={s.id} style={{ gap: space.xxs }}>
              <View style={layout.between}>
                <Text variant="heading" style={{ flex: 1 }}>
                  {s.hobbyTitle}
                </Text>
                <Text tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatMinutes(s.durationMinutes)}
                </Text>
              </View>
              <Text variant="small" tone="faint">
                {formatDay(s.dateKey)}
              </Text>
              {s.reflection ? (
                <Text variant="small" tone="muted" numberOfLines={2} style={{ fontStyle: 'italic' }}>
                  “{s.reflection}”
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Button variant="secondary" label="Start your first 15 minutes" onPress={() => router.navigate('/start')} />
        )}
      </View>
    </Screen>
  );
}
