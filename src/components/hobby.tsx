import { Bookmark, BookmarkCheck, ChevronRight, Play } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, styles as layout } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { MATERIALS, type Material } from '@/domain/catalog';
import type { Hobby, Recommendation } from '@/domain/types';
import { useTheme } from '@/theme/theme';
import { hairline, radius, space } from '@/theme/tokens';

const DIFFICULTY = { easy: 'Easy start', steady: 'Steady', stretch: 'A stretch' } as const;

export const hobbyMeta = (h: Hobby) => `${h.minMinutes}+ min · ${h.costNote} · ${DIFFICULTY[h.difficulty]}`;

export const materialsText = (h: Hobby) =>
  h.materials.length ? h.materials.map((m) => MATERIALS[m as Material] ?? m).join(', ') : 'Nothing you need to buy';

export function StarterTask({ title, steps }: { title: string; steps: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}>
      <Text variant="caption" tone="faint">
        15-minute starter
      </Text>
      <Text variant="heading">{title}</Text>
      {steps.map((s, i) => (
        <View key={s} style={[layout.row, { alignItems: 'flex-start', gap: space.sm }]}>
          <Text variant="small" tone="faint" style={{ width: 16, fontVariant: ['tabular-nums'] }}>
            {i + 1}
          </Text>
          <Text variant="small" tone="muted" style={{ flex: 1 }}>
            {s}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function RecommendationCard({
  rec,
  saved,
  onStart,
  onToggleSave,
}: {
  rec: Recommendation;
  saved: boolean;
  onStart: () => void;
  onToggleSave: () => void;
}) {
  const { colors } = useTheme();
  const { hobby } = rec;
  const SaveIcon = saved ? BookmarkCheck : Bookmark;
  return (
    <Card>
      <View style={layout.between}>
        <Text variant="title" style={{ flex: 1 }}>
          {hobby.title}
        </Text>
        <PressableScale
          accessibilityLabel={saved ? `Remove ${hobby.title} from saved` : `Save ${hobby.title}`}
          accessibilityState={{ selected: saved }}
          onPress={onToggleSave}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <SaveIcon size={22} color={colors.text} strokeWidth={1.75} />
        </PressableScale>
      </View>
      <Text tone="muted">{hobby.description}</Text>
      <View style={{ gap: space.xs, paddingVertical: space.sm, borderTopWidth: hairline, borderColor: colors.border }}>
        <Text variant="caption" tone="faint">
          {rec.source === 'ai' ? 'Why it fits · AI coach' : 'Why it fits'}
        </Text>
        <Text>{rec.reason}</Text>
      </View>
      <Text variant="small" tone="muted">
        {hobbyMeta(hobby)}
      </Text>
      <Text variant="small" tone="muted">
        You'll need: {materialsText(hobby)}
      </Text>
      <StarterTask title={rec.starterTask} steps={rec.steps} />
      <Button label="Start 15 minutes" icon={Play} onPress={onStart} />
    </Card>
  );
}

export function HobbyRow({ hobby, onPress, detail }: { hobby: Hobby; onPress: () => void; detail?: string }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityLabel={`${hobby.title}. ${detail ?? hobbyMeta(hobby)}`}
      onPress={onPress}
      style={[layout.between, { paddingVertical: space.md, borderBottomWidth: hairline, borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text variant="heading">{hobby.title}</Text>
        <Text variant="small" tone="muted">
          {detail ?? hobbyMeta(hobby)}
        </Text>
      </View>
      <ChevronRight size={20} color={colors.textFaint} strokeWidth={1.75} />
    </PressableScale>
  );
}
