import { Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useStore } from '@/application/store';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/controls';
import { Card, SectionLabel, styles as layout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { askBuddy, type BuddyTurn } from '@/infrastructure/local-llm';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

/** A short chat with the on-device AI: ask what to try, or what to do when you're stuck. */
export function CoachBuddy() {
  const { snapshot } = useStore();
  const { colors } = useTheme();
  const model = snapshot.preferences.aiModel;
  const [turns, setTurns] = useState<BuddyTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef(0);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const history = [...turns, { role: 'user' as const, content: text }];
    const id = ++live.current;
    setTurns(history);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const reply = await askBuddy(model, history);
      if (id !== live.current) return;
      setTurns([...history, { role: 'assistant', content: reply || 'Try one tiny step: set a five-minute timer and begin.' }]);
    } catch {
      if (id === live.current) setError("The buddy couldn't answer this time. Try again in a moment.");
    } finally {
      if (id === live.current) setBusy(false);
    }
  }

  return (
    <Card>
      <SectionLabel>Coach buddy</SectionLabel>
      <Text tone="muted">Stuck, bored, or tempted to scroll? Ask. It answers on your phone, offline.</Text>
      {turns.map((t, i) => {
        const you = t.role === 'user';
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={`${you ? 'You' : 'Buddy'}: ${t.content}`}
            style={{
              alignSelf: you ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderRadius: radius.lg,
              backgroundColor: you ? colors.accent : colors.surface,
              borderWidth: you ? 0 : 1,
              borderColor: colors.border,
            }}>
            <Text style={{ color: you ? colors.onAccent : colors.text }}>{t.content}</Text>
          </View>
        );
      })}
      {busy ? (
        <View style={layout.row} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text variant="small" tone="muted">
            Thinking…
          </Text>
        </View>
      ) : null}
      {error ? (
        <Text variant="small" tone="danger">
          {error}
        </Text>
      ) : null}
      <Field label="Ask your buddy" value={draft} onChangeText={setDraft} placeholder="I keep scrolling at night…" onSubmitEditing={() => void send()} returnKeyType="send" />
      <Button label="Send" icon={Send} disabled={!draft.trim() || busy} onPress={() => void send()} />
    </Card>
  );
}
