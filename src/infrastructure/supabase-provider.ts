import type { SupabaseClient } from '@supabase/supabase-js';

import type { Op } from '@/data/snapshot';
import { DEFAULT_PREFERENCES } from '@/data/snapshot';
import type { RemoteData, RemoteProvider } from '@/data/sync';
import type { HobbySession, Preferences, ScrollLog } from '@/domain/types';

type Row = Record<string, unknown>;

const must = <T>({ data, error }: { data: T; error: { message: string } | null }): T => {
  if (error) throw new Error(error.message);
  return data;
};

export const toPreferencesRow = (userId: string, p: Preferences) => ({
  user_id: userId,
  interests: p.interests,
  available_minutes: p.availableMinutes,
  budget: p.budget,
  activity_place: p.place,
  activity_company: p.company,
  skill_level: p.skill,
  materials: p.materials,
  reminder_times: p.reminderTimes,
  reminders_on: p.remindersOn,
  baseline_daily_minutes: p.baselineDailyMinutes,
  daily_goal_minutes: p.dailyGoalMinutes,
  share_progress: p.shareProgress,
  leaderboard_opt_in: p.leaderboardOptIn,
  ai_consent: p.aiConsent,
});

export function fromPreferencesRow(r: Row, profile: Row | null): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    name: (profile?.display_name as string) ?? '',
    privacyMode: !!profile?.privacy_mode,
    interests: r.interests as Preferences['interests'],
    availableMinutes: r.available_minutes as Preferences['availableMinutes'],
    budget: r.budget as Preferences['budget'],
    place: r.activity_place as Preferences['place'],
    company: r.activity_company as Preferences['company'],
    skill: r.skill_level as Preferences['skill'],
    materials: r.materials as string[],
    reminderTimes: r.reminder_times as string[],
    remindersOn: !!r.reminders_on,
    baselineDailyMinutes: (r.baseline_daily_minutes as number | null) ?? null,
    dailyGoalMinutes: r.daily_goal_minutes as number,
    shareProgress: !!r.share_progress,
    leaderboardOptIn: !!r.leaderboard_opt_in,
    aiConsent: !!r.ai_consent,
    onboarded: true,
  };
}

export const toSessionRow = (userId: string, s: HobbySession) => ({
  id: s.id,
  user_id: userId,
  hobby_id: s.hobbyId,
  started_at: new Date(s.startedAt).toISOString(),
  completed_at: new Date(s.completedAt).toISOString(),
  local_date: s.dateKey,
  duration_minutes: s.durationMinutes,
  status: s.status,
  reflection: s.reflection,
});

export const fromSessionRow = (r: Row, titles: Map<string, string>): HobbySession => ({
  id: r.id as string,
  hobbyId: r.hobby_id as string,
  hobbyTitle: titles.get(r.hobby_id as string) ?? (r.hobby_id as string),
  startedAt: Date.parse(r.started_at as string),
  completedAt: Date.parse(r.completed_at as string),
  durationMinutes: r.duration_minutes as number,
  status: 'completed',
  reflection: (r.reflection as string) ?? '',
  dateKey: r.local_date as string,
});

export const toLogRow = (userId: string, l: ScrollLog) => ({
  id: l.id,
  user_id: userId,
  date: l.dateKey,
  estimated_minutes: l.minutes,
  source: l.source,
  note: l.note,
  created_at: new Date(l.createdAt).toISOString(),
});

export const fromLogRow = (r: Row): ScrollLog => ({
  id: r.id as string,
  dateKey: r.date as string,
  minutes: r.estimated_minutes as number,
  source: 'manual',
  note: (r.note as string) ?? '',
  createdAt: Date.parse(r.created_at as string),
});

export function supabaseProvider(client: SupabaseClient, userId: string, titles: Map<string, string>): RemoteProvider {
  return {
    async pull(): Promise<RemoteData> {
      const [prefs, profile, sessions, logs, saved] = await Promise.all([
        client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
        client.from('profiles').select('display_name, privacy_mode').eq('id', userId).maybeSingle(),
        client.from('hobby_sessions').select('*').eq('user_id', userId),
        client.from('scroll_logs').select('*').eq('user_id', userId),
        client.from('saved_hobbies').select('hobby_id').eq('user_id', userId),
      ]);
      const prefRow = must(prefs);
      return {
        preferences: prefRow ? fromPreferencesRow(prefRow, must(profile)) : null,
        sessions: (must(sessions) ?? []).map((r) => fromSessionRow(r, titles)),
        scrollLogs: (must(logs) ?? []).map(fromLogRow),
        savedHobbyIds: (must(saved) ?? []).map((r) => r.hobby_id as string),
      };
    },

    async apply(op: Op) {
      switch (op.type) {
        case 'preferences':
          must(await client.from('user_preferences').upsert(toPreferencesRow(userId, op.value)));
          must(
            await client
              .from('profiles')
              .update({ display_name: op.value.name.slice(0, 40), privacy_mode: op.value.privacyMode })
              .eq('id', userId),
          );
          return;
        case 'session':
          // Ignoring duplicates makes a retried upload after a timeout harmless.
          must(await client.from('hobby_sessions').upsert(toSessionRow(userId, op.value), { ignoreDuplicates: true }));
          return;
        case 'scrollLog':
          must(await client.from('scroll_logs').upsert(toLogRow(userId, op.value)));
          return;
        case 'deleteScrollLog':
          must(await client.from('scroll_logs').delete().eq('id', op.id));
          return;
        case 'savedHobbies': {
          const keep = op.ids.length ? `(${op.ids.map((id) => `"${id}"`).join(',')})` : '("")';
          must(await client.from('saved_hobbies').delete().eq('user_id', userId).not('hobby_id', 'in', keep));
          if (op.ids.length) {
            must(
              await client
                .from('saved_hobbies')
                .upsert(op.ids.map((hobby_id) => ({ user_id: userId, hobby_id })), { ignoreDuplicates: true }),
            );
          }
          return;
        }
      }
    },

    async deleteAll() {
      for (const table of ['hobby_sessions', 'scroll_logs', 'saved_hobbies', 'recommendations', 'daily_goals', 'user_preferences']) {
        must(await client.from(table).delete().eq('user_id', userId));
      }
    },
  };
}
