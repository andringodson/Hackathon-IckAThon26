import { HandHeart, Share2, UserPlus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';

import { useActions, useStore, type Account } from '@/application/store';
import { useToday } from '@/application/use-today';
import { Button } from '@/components/ui/button';
import { Field, ToggleRow } from '@/components/ui/controls';
import { Card, FadeIn, Meter, Rule, Screen, SectionLabel, styles as layout } from '@/components/ui/layout';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { challengeProgress, WEEKLY_CHALLENGES } from '@/domain/challenges';
import { weekStart } from '@/domain/dates';
import { summarize } from '@/domain/progress';
import {
  acceptFriend,
  listFriends,
  myInviteCode,
  sendFriendRequest,
  weeklyLeaderboard,
  type BoardRow,
  type FriendRow,
} from '@/infrastructure/social';
import { supabase } from '@/infrastructure/supabase';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

// Example people that show how Arena works before real friends join. Always labelled as samples.
const SAMPLE_FEED = [
  { id: 'sample-1', name: 'Ananya', text: 'finished 15 minutes of pocket sketching' },
  { id: 'sample-2', name: 'Rohit', text: 'tried run and walk for the first time' },
  { id: 'sample-3', name: 'Meera', text: 'kept a three-day journaling streak' },
];
const SAMPLE_BOARD = [
  { name: 'Ananya', minutes: 95 },
  { name: 'Rohit', minutes: 60 },
  { name: 'Meera', minutes: 40 },
];

export default function Arena() {
  const { snapshot, account } = useStore();
  const actions = useActions();
  const today = useToday();
  const p = snapshot.preferences;
  const myWeek = useMemo(() => summarize(snapshot.sessions, today, p.dailyGoalMinutes).weekMinutes, [snapshot.sessions, today, p.dailyGoalMinutes]);
  const real = !!supabase && !!account;

  const invite = () =>
    Share.share({
      message: "I'm using STILL to swap some scrolling for small hobbies. Want to try it with me? We can cheer each other on.",
    }).catch(() => {});

  return (
    <Screen tabs>
      <View style={{ gap: space.sm }}>
        <Text variant="display">Arena</Text>
        <Text tone="muted">Optional. Friends keep each other going, without anyone seeing your screen time.</Text>
      </View>

      <FadeIn index={0}>
        <Card>
          <SectionLabel>Sharing</SectionLabel>
          <ToggleRow
            label="Share my hobby progress with friends"
            detail="Hobby minutes and challenges only. Never scrolling numbers."
            value={p.shareProgress}
            onChange={(shareProgress) => actions.updatePreferences({ shareProgress })}
          />
          <ToggleRow
            label="Show me on the weekly leaderboard"
            detail="Resets every Monday."
            value={p.leaderboardOptIn}
            onChange={(leaderboardOptIn) => actions.updatePreferences({ leaderboardOptIn })}
          />
        </Card>
      </FadeIn>

      {real ? <Friends account={account!} today={today} optedIn={p.leaderboardOptIn} /> : null}

      <View style={{ gap: space.md }}>
        <SectionLabel>This week's challenges</SectionLabel>
        {WEEKLY_CHALLENGES.map((c, i) => {
          const joined = snapshot.arena.joinedChallenges.includes(c.id);
          const prog = challengeProgress(c, snapshot.sessions, today);
          return (
            <FadeIn key={c.id} index={i + 1}>
              <Card>
                <View style={layout.between}>
                  <Text variant="heading" style={{ flex: 1 }}>
                    {c.title}
                  </Text>
                  {prog.done && joined ? (
                    <Text variant="small" tone="positive">
                      Done
                    </Text>
                  ) : null}
                </View>
                <Text tone="muted">{c.description}</Text>
                {joined ? (
                  <>
                    <Meter value={prog.value / prog.target} label={`${c.title} progress`} />
                    <Text variant="small" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                      {prog.value} of {prog.target}
                    </Text>
                  </>
                ) : null}
                <Button
                  variant={joined ? 'quiet' : 'secondary'}
                  label={joined ? 'Leave challenge' : 'Join'}
                  onPress={() => actions.toggleChallenge(c.id)}
                />
              </Card>
            </FadeIn>
          );
        })}
      </View>

      {!real ? (
        <>
          {p.leaderboardOptIn ? (
            <View style={{ gap: space.md }}>
              <SectionLabel>Weekly leaderboard · sample</SectionLabel>
              <Text variant="small" tone="faint">
                Your minutes are real. The other names are examples until your friends join.
              </Text>
              <Board rows={[{ userId: 'me', name: 'You', minutes: myWeek, isMe: true }, ...SAMPLE_BOARD.map((s) => ({ userId: s.name, name: `${s.name} (sample)`, minutes: s.minutes, isMe: false }))]} />
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionLabel>Friend activity · sample</SectionLabel>
            <Text variant="small" tone="faint">
              Example people showing how encouragement works. Not real users.
            </Text>
            {SAMPLE_FEED.map((f) => (
              <Cheer
                key={f.id}
                name={`${f.name} (sample)`}
                text={f.text}
                cheered={snapshot.arena.cheered.includes(f.id)}
                onToggle={() => actions.toggleCheer(f.id)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Button variant="secondary" label="Invite a friend" icon={Share2} onPress={invite} />
    </Screen>
  );
}

function Board({ rows }: { rows: BoardRow[] }) {
  const sorted = [...rows].sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...sorted.map((r) => r.minutes));
  return (
    <Card>
      {sorted.map((r, i) => (
        <View key={r.userId} style={{ gap: space.xs }} accessible accessibilityLabel={`${i + 1}. ${r.name}, ${r.minutes} minutes`}>
          <View style={layout.between}>
            <Text variant={r.isMe ? 'heading' : 'body'}>
              {i + 1}. {r.name}
            </Text>
            <Text tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {r.minutes} min
            </Text>
          </View>
          <Meter value={r.minutes / max} label={`${r.name} minutes`} />
        </View>
      ))}
    </Card>
  );
}

function Cheer({ name, text, cheered, onToggle }: { name: string; text: string; cheered: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[layout.between, { alignItems: 'center' }]}>
      <Text style={{ flex: 1 }}>
        <Text variant="heading">{name}</Text> {text}
      </Text>
      <PressableScale
        accessibilityLabel={cheered ? `Remove cheer for ${name}` : `Cheer ${name} on`}
        accessibilityState={{ selected: cheered }}
        onPress={onToggle}
        haptic
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          paddingHorizontal: space.md,
          minHeight: 36,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: cheered ? colors.accent : colors.border,
          backgroundColor: cheered ? colors.accent : 'transparent',
        }}>
        <HandHeart size={16} color={cheered ? colors.onAccent : colors.text} strokeWidth={1.75} />
        <Text variant="small" style={{ color: cheered ? colors.onAccent : colors.text }}>
          {cheered ? 'Cheered' : 'Cheer'}
        </Text>
      </PressableScale>
    </View>
  );
}

function Friends({ account, today, optedIn }: { account: Account; today: string; optedIn: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [board, setBoard] = useState<BoardRow[] | null>(null);
  const [entry, setEntry] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([myInviteCode(account.id), listFriends(account.id), optedIn ? weeklyLeaderboard(weekStart(today)) : null])
      .then(([c, f, b]) => {
        if (!alive) return;
        setCode(c);
        setFriends(f);
        setBoard(b);
      })
      .catch(() => alive && setMessage("Couldn't reach your friends list. Check your connection."));
    return () => {
      alive = false;
    };
  }, [account.id, today, optedIn, version]);

  const add = async () => {
    if (!/^[0-9a-f]{8}$/i.test(entry.trim())) return setMessage('Invite codes are 8 letters and numbers.');
    setBusy(true);
    try {
      const r = await sendFriendRequest(entry);
      setMessage(r === 'sent' ? 'Request sent.' : r === 'self' ? "That's your own code." : 'No one has that code.');
      if (r === 'sent') setEntry('');
      setVersion((v) => v + 1);
    } catch {
      setMessage("Couldn't send that. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id: string) => {
    try {
      await acceptFriend(id);
      setVersion((v) => v + 1);
    } catch {
      setMessage("Couldn't accept that request. Try again.");
    }
  };

  if (!friends) {
    return message ? <Text tone="muted">{message}</Text> : <ActivityIndicator style={{ alignSelf: 'flex-start' }} />;
  }

  const incoming = friends.filter((f) => f.incoming && f.status === 'pending');
  const accepted = friends.filter((f) => f.status === 'accepted');

  return (
    <View style={{ gap: space.md }}>
      <SectionLabel>Friends</SectionLabel>
      <Card>
        <Text tone="muted">Your invite code</Text>
        <Text variant="title" selectable style={{ letterSpacing: 4, fontVariant: ['tabular-nums'] }}>
          {code}
        </Text>
        <Button
          variant="quiet"
          label="Share my code"
          icon={Share2}
          onPress={() => Share.share({ message: `Add me on STILL. My invite code is ${code}.` }).catch(() => {})}
        />
        <Rule />
        <Field label="Add a friend by code" autoCapitalize="characters" maxLength={8} value={entry} onChangeText={setEntry} />
        <Button label="Send request" icon={UserPlus} loading={busy} onPress={add} />
        {message ? (
          <Text variant="small" tone="muted" accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
      </Card>
      {incoming.map((f) => (
        <Card key={f.id}>
          <Text>{f.name} wants to be friends.</Text>
          <Button label="Accept" onPress={() => accept(f.id)} />
        </Card>
      ))}
      <Text tone="muted">
        {accepted.length
          ? `Friends: ${accepted.map((f) => f.name).join(', ')}`
          : 'No friends yet. Share your code with someone you trust.'}
      </Text>
      {board ? (
        <>
          <SectionLabel>Weekly leaderboard</SectionLabel>
          <Board rows={board} />
        </>
      ) : null}
    </View>
  );
}
