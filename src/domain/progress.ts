import { addDays, daysInRange, weekStart } from './dates';
import type { HobbySession, ScrollLog } from './types';

export interface ReclaimedEstimate {
  minutes: number;
  loggedDays: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Compares this week's logged days against the user's typical day.
 * Only days with an entry count, so a missing log is never read as zero scrolling.
 * Hobby minutes are deliberately not part of this number.
 */
export function estimateReclaimed(
  logs: ScrollLog[],
  baselineDailyMinutes: number | null,
  todayKey: string,
): ReclaimedEstimate | null {
  if (baselineDailyMinutes === null) return null;
  const periodStart = weekStart(todayKey);
  const inPeriod = logs.filter((l) => l.dateKey >= periodStart && l.dateKey <= todayKey);
  const loggedDays = new Set(inPeriod.map((l) => l.dateKey)).size;
  if (loggedDays === 0) return null;
  const current = inPeriod.reduce((sum, l) => sum + l.minutes, 0);
  return {
    minutes: Math.max(0, baselineDailyMinutes * loggedDays - current),
    loggedDays,
    periodStart,
    periodEnd: todayKey,
  };
}

export function minutesOn(sessions: HobbySession[], key: string): number {
  return sessions.filter((s) => s.dateKey === key).reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function weekDays(todayKey: string): string[] {
  const start = weekStart(todayKey);
  return daysInRange(start, addDays(start, 6));
}

/** Consecutive days with a session, ending today, or yesterday if today has none yet. */
export function streak(sessions: HobbySession[], todayKey: string): number {
  const days = new Set(sessions.map((s) => s.dateKey));
  let key = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let count = 0;
  while (days.has(key)) {
    count++;
    key = addDays(key, -1);
  }
  return count;
}

export interface Summary {
  todayMinutes: number;
  weekMinutes: number;
  weekSessions: number;
  totalMinutes: number;
  totalSessions: number;
  streak: number;
  goalDaysThisWeek: number;
  week: { key: string; minutes: number; future: boolean }[];
}

export function summarize(sessions: HobbySession[], todayKey: string, dailyGoal: number): Summary {
  const week = weekDays(todayKey).map((key) => ({ key, minutes: minutesOn(sessions, key), future: key > todayKey }));
  const thisWeek = sessions.filter((s) => s.dateKey >= week[0].key && s.dateKey <= todayKey);
  return {
    todayMinutes: minutesOn(sessions, todayKey),
    weekMinutes: thisWeek.reduce((sum, s) => sum + s.durationMinutes, 0),
    weekSessions: thisWeek.length,
    totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    totalSessions: sessions.length,
    streak: streak(sessions, todayKey),
    goalDaysThisWeek: week.filter((d) => !d.future && d.minutes >= dailyGoal).length,
    week,
  };
}

export interface Milestone {
  id: string;
  title: string;
  reached: boolean;
}

export function milestones(s: Summary): Milestone[] {
  return [
    { id: 'first', title: 'First session', reached: s.totalSessions >= 1 },
    { id: 'three-days', title: 'Three days in a row', reached: s.streak >= 3 },
    { id: 'five', title: 'Five sessions', reached: s.totalSessions >= 5 },
    { id: 'hundred', title: '100 minutes of hobbies', reached: s.totalMinutes >= 100 },
    { id: 'week', title: 'Seven days in a row', reached: s.streak >= 7 },
  ];
}
