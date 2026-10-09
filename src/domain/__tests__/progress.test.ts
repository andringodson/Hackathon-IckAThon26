import { estimateReclaimed, milestones, streak, summarize } from '../progress';
import type { HobbySession, ScrollLog } from '../types';

const log = (dateKey: string, minutes: number): ScrollLog => ({
  id: `${dateKey}-${minutes}`,
  dateKey,
  minutes,
  source: 'manual',
  note: '',
  createdAt: 0,
});

const session = (dateKey: string, durationMinutes: number): HobbySession => ({
  id: `${dateKey}-${durationMinutes}-${Math.random()}`,
  hobbyId: 'sketching',
  hobbyTitle: 'Pocket sketching',
  startedAt: 0,
  completedAt: 0,
  durationMinutes,
  status: 'completed',
  reflection: '',
  dateKey,
});

const FRIDAY = '2026-10-09';

describe('estimateReclaimed', () => {
  test('compares only logged days of this week to the baseline', () => {
    const logs = [log('2026-10-05', 120), log('2026-10-07', 60), log('2026-10-04', 10)];
    // Two logged days this week (Sunday 4th is last week). 180*2 - 180 = 180.
    expect(estimateReclaimed(logs, 180, FRIDAY)).toEqual({
      minutes: 180,
      loggedDays: 2,
      periodStart: '2026-10-05',
      periodEnd: FRIDAY,
    });
  });

  test('a heavier day offsets a lighter one and never goes negative', () => {
    expect(estimateReclaimed([log('2026-10-05', 300), log('2026-10-06', 60)], 120, FRIDAY)?.minutes).toBe(0);
  });

  test('sums several entries on the same day as one day', () => {
    const r = estimateReclaimed([log('2026-10-06', 30), log('2026-10-06', 20)], 120, FRIDAY);
    expect(r).toMatchObject({ minutes: 70, loggedDays: 1 });
  });

  test('returns null without a baseline or without entries', () => {
    expect(estimateReclaimed([log('2026-10-06', 30)], null, FRIDAY)).toBeNull();
    expect(estimateReclaimed([], 120, FRIDAY)).toBeNull();
    expect(estimateReclaimed([log('2026-09-30', 30)], 120, FRIDAY)).toBeNull();
  });

  test('ignores entries after today', () => {
    expect(estimateReclaimed([log('2026-10-10', 0)], 120, FRIDAY)).toBeNull();
  });
});

test('hobby minutes never count as reclaimed time', () => {
  const s = summarize([session(FRIDAY, 60)], FRIDAY, 15);
  expect(s.todayMinutes).toBe(60);
  expect(estimateReclaimed([], 120, FRIDAY)).toBeNull();
});

describe('streak', () => {
  test('counts back from today', () => {
    expect(streak([session('2026-10-07', 5), session('2026-10-08', 5), session(FRIDAY, 5)], FRIDAY)).toBe(3);
  });
  test('still counts when today has nothing yet', () => {
    expect(streak([session('2026-10-07', 5), session('2026-10-08', 5)], FRIDAY)).toBe(2);
  });
  test('a gap ends it', () => {
    expect(streak([session('2026-10-06', 5), session('2026-10-08', 5)], FRIDAY)).toBe(1);
    expect(streak([], FRIDAY)).toBe(0);
  });
});

test('summarize builds a Monday-to-Sunday week and goal days', () => {
  const s = summarize([session('2026-10-05', 20), session('2026-10-06', 10), session(FRIDAY, 15), session('2026-10-01', 40)], FRIDAY, 15);
  expect(s.week.map((d) => d.key)).toEqual([
    '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
  ]);
  expect(s.week[5].future).toBe(true);
  expect(s.weekMinutes).toBe(45);
  expect(s.weekSessions).toBe(3);
  expect(s.totalMinutes).toBe(85);
  expect(s.goalDaysThisWeek).toBe(2);
});

test('milestones follow the summary', () => {
  const reached = milestones(summarize([session(FRIDAY, 15)], FRIDAY, 15)).filter((m) => m.reached);
  expect(reached.map((m) => m.id)).toEqual(['first']);
});
