import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, styles as layout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { formatDay, formatMinutes, weekdayLetter } from '@/domain/dates';
import type { ReclaimedEstimate, Summary } from '@/domain/progress';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

export function WeekDots({ week }: { week: Summary['week'] }) {
  const { colors } = useTheme();
  const active = week.filter((d) => d.minutes > 0).length;
  return (
    <View accessible accessibilityLabel={`Hobby time on ${active} of 7 days this week`} style={[layout.row, { gap: space.md }]}>
      {week.map((d) => (
        <View key={d.key} style={{ alignItems: 'center', gap: space.xs }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: radius.pill,
              backgroundColor: d.minutes > 0 ? colors.accent : 'transparent',
              borderWidth: 1,
              borderColor: d.future ? colors.border : colors.borderStrong,
            }}
          />
          <Text variant="small" tone="faint" style={{ fontSize: 11 }}>
            {weekdayLetter(d.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function WeekBars({ week, goal }: { week: Summary['week']; goal: number }) {
  const { colors } = useTheme();
  const max = Math.max(goal, ...week.map((d) => d.minutes), 1);
  const HEIGHT = 120;
  const label = week.map((d) => `${formatDay(d.key)}: ${d.minutes} minutes`).join('. ');
  return (
    <View accessible accessibilityLabel={`This week. ${label}`} style={{ gap: space.sm }}>
      <View style={{ height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: (goal / max) * HEIGHT,
            borderTopWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.borderStrong,
          }}
        />
        {week.map((d) => (
          <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
            {d.minutes > 0 ? (
              <Text variant="small" tone="muted" style={{ fontSize: 11, fontVariant: ['tabular-nums'] }}>
                {d.minutes}
              </Text>
            ) : null}
            <View
              style={{
                width: '100%',
                maxWidth: 28,
                height: Math.max(2, (d.minutes / max) * (HEIGHT - 20)),
                borderRadius: radius.sm,
                backgroundColor: d.minutes > 0 ? colors.accent : colors.surfaceMuted,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {week.map((d) => (
          <Text key={d.key} variant="small" tone="faint" style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
            {weekdayLetter(d.key)}
          </Text>
        ))}
      </View>
      <Text variant="small" tone="faint">
        Dashed line: your daily goal of {goal} min
      </Text>
    </View>
  );
}

export function ReclaimedCard({
  estimate,
  baseline,
  privacyMode,
  compact,
}: {
  estimate: ReclaimedEstimate | null;
  baseline: number | null;
  privacyMode: boolean;
  compact?: boolean;
}) {
  return (
    <Card>
      <Text variant="caption" tone="faint">
        Time reclaimed · estimate
      </Text>
      {privacyMode ? (
        <Text tone="muted">Hidden while privacy mode is on.</Text>
      ) : estimate ? (
        <>
          <Text variant="numeral" accessibilityLabel={`About ${formatMinutes(estimate.minutes)} reclaimed this week`}>
            {formatMinutes(estimate.minutes)}
          </Text>
          <Text variant="small" tone="muted">
            This week ({formatDay(estimate.periodStart)} to {formatDay(estimate.periodEnd)}), compared with your usual{' '}
            {formatMinutes(baseline ?? 0)} a day, across {estimate.loggedDays} logged{' '}
            {estimate.loggedDays === 1 ? 'day' : 'days'}. Based on what you entered, not measured.
          </Text>
        </>
      ) : (
        <Text tone="muted">
          {baseline === null
            ? 'Tell STILL how long you usually scroll, then log a day to see time you have won back.'
            : "Log today's scrolling to see how much time you've won back this week."}
        </Text>
      )}
      {!privacyMode && !compact ? (
        <Button
          variant="secondary"
          label={baseline === null ? 'Set your usual scroll time' : 'Log scrolling'}
          onPress={() => router.push(baseline === null ? '/settings' : '/log-scroll')}
        />
      ) : null}
    </Card>
  );
}
