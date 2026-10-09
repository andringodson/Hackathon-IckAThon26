import { router } from 'expo-router';
import { RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getRecommendations } from '@/application/coach';
import { useActions, useStore } from '@/application/store';
import { HobbyRow, RecommendationCard } from '@/components/hobby';
import { QUIZ, answerText } from '@/components/quiz';
import { Button } from '@/components/ui/button';
import { ToggleRow } from '@/components/ui/controls';
import { Card, FadeIn, Screen, SectionLabel, styles as layout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { HOBBIES } from '@/domain/catalog';
import { localRecommendations, type CoachAnswers } from '@/domain/ranking';
import type { Recommendation } from '@/domain/types';
import { coachInvoker } from '@/infrastructure/coach-invoker';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const pickAnswers = ({ interests, availableMinutes, budget, place, company, skill, materials }: CoachAnswers): CoachAnswers => ({
  interests,
  availableMinutes,
  budget,
  place,
  company,
  skill,
  materials,
});

export default function Discover() {
  const { snapshot, account } = useStore();
  const actions = useActions();
  const p = snapshot.preferences;

  const [answers, setAnswers] = useState<CoachAnswers>(() => pickAnswers(p));
  const [step, setStep] = useState<number | null>(p.interests.length ? null : 0);
  const [recs, setRecs] = useState<Recommendation[]>(() => localRecommendations(HOBBIES, pickAnswers(p)));
  const [shown, setShown] = useState<string[]>(() => recs.map((r) => r.hobby.id));
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const aiAvailable = !!coachInvoker && !!account;
  const invoke = aiAvailable && p.aiConsent ? coachInvoker : null;

  async function suggest(a: CoachAnswers, exclude: string[]) {
    setLoading(true);
    setNote(null);
    const result = await getRecommendations(a, exclude, invoke);
    setRecs(result.recommendations);
    setShown((s) => [...new Set([...exclude, ...s, ...result.recommendations.map((r) => r.hobby.id)])]);
    setNote(result.fallbackReason);
    setLoading(false);
  }

  function finishQuiz() {
    actions.updatePreferences(answers);
    setStep(null);
    void suggest(answers, []);
  }

  function start(id: string) {
    actions.setCurrentHobby(id);
    router.push('/start');
  }

  const saved = HOBBIES.filter((h) => snapshot.savedHobbyIds.includes(h.id));

  return (
    <Screen tabs>
      <View style={{ gap: space.sm }}>
        <Text variant="display">Discover</Text>
        <Text tone="muted">A few questions, then three things worth fifteen minutes.</Text>
      </View>

      {step !== null ? (
        <Quiz
          answers={answers}
          step={step}
          onChange={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
          onNext={() => (step + 1 < QUIZ.length ? setStep(step + 1) : finishQuiz())}
          onBack={() => setStep(Math.max(0, step - 1))}
        />
      ) : (
        <>
          {aiAvailable ? (
            <Card>
              <ToggleRow
                label="Use the AI coach"
                detail="Sends only your quiz answers to Google Gemini to write suggestions. Never your name or screen time."
                value={p.aiConsent}
                onChange={(aiConsent) => actions.updatePreferences({ aiConsent })}
              />
            </Card>
          ) : null}

          {note ? (
            <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
              {note}
            </Text>
          ) : null}

          {loading ? (
            <View style={[layout.row, { paddingVertical: space.xl }]} accessibilityLiveRegion="polite">
              <ActivityIndicator />
              <Text tone="muted">Thinking about what would suit you…</Text>
            </View>
          ) : recs.length ? (
            recs.map((rec, i) => (
              <FadeIn key={rec.hobby.id} index={i}>
                <RecommendationCard
                  rec={rec}
                  saved={snapshot.savedHobbyIds.includes(rec.hobby.id)}
                  onStart={() => start(rec.hobby.id)}
                  onToggleSave={() => actions.toggleSaved(rec.hobby.id)}
                />
              </FadeIn>
            ))
          ) : (
            <Card>
              <Text variant="heading">Nothing fits those limits yet</Text>
              <Text tone="muted">Try a little more time or a flexible budget, and there will be plenty.</Text>
            </Card>
          )}

          <View style={{ gap: space.sm }}>
            <Button
              variant="secondary"
              label="Show three others"
              icon={RefreshCw}
              disabled={loading || !recs.length}
              onPress={() => void suggest(answers, shown)}
            />
            {invoke && recs[0]?.source === 'local' ? (
              <Button variant="secondary" label="Ask the AI coach" icon={Sparkles} disabled={loading} onPress={() => void suggest(answers, [])} />
            ) : null}
            <Button variant="quiet" label="Change my answers" icon={SlidersHorizontal} onPress={() => setStep(0)} />
          </View>

          {saved.length ? (
            <View>
              <SectionLabel>Saved</SectionLabel>
              <View style={{ marginTop: space.md }}>
                {saved.map((h) => (
                  <HobbyRow key={h.id} hobby={h} onPress={() => start(h.id)} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Quiz({
  answers,
  step,
  onChange,
  onNext,
  onBack,
}: {
  answers: CoachAnswers;
  step: number;
  onChange: (patch: Partial<CoachAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  const current = QUIZ[step];
  return (
    <View style={{ gap: space.lg }}>
      {QUIZ.slice(0, step).map((s) => (
        <View key={s.key} style={{ gap: space.sm }}>
          <Bubble from="coach">{s.question}</Bubble>
          <Bubble from="you">{answerText(s, answers)}</Bubble>
        </View>
      ))}
      <FadeIn key={current.key} style={{ gap: space.lg }}>
        <Bubble from="coach">{current.question}</Bubble>
        {current.render(answers, onChange)}
        <View style={[layout.row, { justifyContent: 'space-between' }]}>
          {step > 0 ? <Button variant="quiet" label="Back" onPress={onBack} /> : <View />}
          <Button
            label={step + 1 === QUIZ.length ? 'Show me three ideas' : 'Next'}
            onPress={onNext}
            style={{ flexShrink: 1 }}
          />
        </View>
      </FadeIn>
      <Text variant="small" tone="faint" style={{ color: colors.textFaint }}>
        Question {step + 1} of {QUIZ.length}. Everything is optional.
      </Text>
    </View>
  );
}

function Bubble({ from, children }: { from: 'coach' | 'you'; children: string }) {
  const { colors } = useTheme();
  const you = from === 'you';
  return (
    <View
      accessible
      accessibilityLabel={`${you ? 'You' : 'Coach'}: ${children}`}
      style={{
        alignSelf: you ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderRadius: radius.lg,
        backgroundColor: you ? colors.accent : colors.surface,
        borderWidth: you ? 0 : 1,
        borderColor: colors.border,
      }}>
      <Text style={{ color: you ? colors.onAccent : colors.text }}>{children}</Text>
    </View>
  );
}
