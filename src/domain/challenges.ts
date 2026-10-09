import { HOBBIES } from './catalog';
import { weekStart } from './dates';
import type { HobbySession, Interest } from './types';

export type ChallengeRule =
  | { kind: 'sessions'; target: number }
  | { kind: 'minutes'; target: number; category?: Interest }
  | { kind: 'distinct'; target: number }
  | { kind: 'days'; target: number };

export interface Challenge {
  id: string;
  title: string;
  description: string;
  rule: ChallengeRule;
}

export const WEEKLY_CHALLENGES: Challenge[] = [
  { id: 'five-sessions', title: 'Five small starts', description: 'Save five sessions this week, any length.', rule: { kind: 'sessions', target: 5 } },
  { id: 'make-an-hour', title: 'An hour of making', description: 'Spend sixty minutes making something with your hands.', rule: { kind: 'minutes', target: 60, category: 'making' } },
  { id: 'try-three', title: 'Try three things', description: 'Do three different hobbies this week.', rule: { kind: 'distinct', target: 3 } },
  { id: 'four-days', title: 'Four days of something', description: 'Do anything at all on four days this week.', rule: { kind: 'days', target: 4 } },
];

const category = new Map(HOBBIES.map((h) => [h.id, h.category]));

/** Progress this week (Monday to today), from saved sessions only. */
export function challengeProgress(c: Challenge, sessions: HobbySession[], todayKey: string): { value: number; target: number; done: boolean } {
  const start = weekStart(todayKey);
  const week = sessions.filter((s) => s.dateKey >= start && s.dateKey <= todayKey);
  const r = c.rule;
  const value =
    r.kind === 'sessions'
      ? week.length
      : r.kind === 'minutes'
        ? week.filter((s) => !r.category || category.get(s.hobbyId) === r.category).reduce((sum, s) => sum + s.durationMinutes, 0)
        : r.kind === 'distinct'
          ? new Set(week.map((s) => s.hobbyId)).size
          : new Set(week.map((s) => s.dateKey)).size;
  return { value: Math.min(value, r.target), target: r.target, done: value >= r.target };
}
