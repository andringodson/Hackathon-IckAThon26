import { router } from 'expo-router';
import { Compass, Play, Settings } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { greeting, intentionFor, useToday } from '@/application/use-today';
import { useActions, useStore } from '@/application/store';
import { Wordmark } from '@/components/brand';
import { hobbyMeta } from '@/components/hobby';
import { ReclaimedCard, WeekDots } from '@/components/progress';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/controls';
import { Card, FadeIn, Meter, Screen, styles as layout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { HOBBIES } from '@/domain/catalog';
import { estimateReclaimed, summarize } from '@/domain/progress';
import { localRecommendations } from '@/domain/ranking';
import { space } from '@/theme/tokens';

export default function Home() {
  const { snapshot } = useStore();
  const actions = useActions();
  const today = useToday();
  const { preferences: p, sessions, scrollLogs, currentHobbyId } = snapshot;

  const summary = useMemo(() => summarize(sessions, today, p.dailyGoalMinutes), [sessions, today, p.dailyGoalMinutes]);
  const estimate = useMemo(
    () => estimateReclaimed(scrollLogs, p.baselineDailyMinutes, today),
    [scrollLogs, p.baselineDailyMinutes, today],
  );
  const featured = useMemo(
    () => HOBBIES.find((h) => h.id === currentHobbyId) ?? localRecommendations(HOBBIES, p)[0]?.hobby ?? HOBBIES[0],
    [currentHobbyId, p],
  );

  const goalLeft = Math.max(0, p.dailyGoalMinutes - summary.todayMinutes);
  const name = p.name.trim();

  return (
    <Screen tabs>
      <View style={layout.between}>
        <Wordmark size={20} />
        <IconButton icon={Settings} label="Profile and settings" onPress={() => router.push('/settings')} />
      </View>

      <FadeIn index={0} style={{ gap: space.sm }}>
        <Text variant="display">
          {greeting()}
          {name ? `, ${name}` : ''}.
        </Text>
        <Text tone="muted">{intentionFor(today)}</Text>
      </FadeIn>

      <FadeIn index={1}>
        <Card>
          <Text variant="caption" tone="faint">
            {currentHobbyId ? 'Your hobby' : 'Something to try'}
          </Text>
          <Text variant="title">{featured.title}</Text>
          <Text tone="muted">{featured.starter.title}.</Text>
          <Text variant="small" tone="faint">
            {hobbyMeta(featured)}
          </Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button
              label="Start 15 minutes"
              icon={Play}
              onPress={() => {
                actions.setCurrentHobby(featured.id);
                router.push('/start');
              }}
            />
            <Button variant="secondary" label="Find something to do" icon={Compass} onPress={() => router.push('/discover')} />
          </View>
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <Card>
          <View style={layout.between}>
            <Text variant="caption" tone="faint">
              Today
            </Text>
            <Text variant="small" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {summary.todayMinutes} of {p.dailyGoalMinutes} min
            </Text>
          </View>
          <Meter value={summary.todayMinutes / p.dailyGoalMinutes} label="Today's hobby goal" />
          <Text tone="muted">
            {summary.todayMinutes === 0
              ? 'Nothing yet today, and that is fine. A small start still counts.'
              : goalLeft > 0
                ? `${goalLeft} minutes to your goal.`
                : 'Goal reached for today. Anything more is a bonus.'}
          </Text>
          <View style={[layout.between, { marginTop: space.sm }]}>
            <WeekDots week={summary.week} />
          </View>
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <ReclaimedCard estimate={estimate} baseline={p.baselineDailyMinutes} privacyMode={p.privacyMode} />
      </FadeIn>
    </Screen>
  );
}
