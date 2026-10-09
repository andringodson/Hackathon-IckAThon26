import { challengeProgress, WEEKLY_CHALLENGES } from '../challenges';
import type { HobbySession } from '../types';

const s = (hobbyId: string, dateKey: string, durationMinutes = 15): HobbySession => ({
  id: `${hobbyId}-${dateKey}-${durationMinutes}`,
  hobbyId,
  hobbyTitle: hobbyId,
  startedAt: 0,
  completedAt: 0,
  durationMinutes,
  status: 'completed',
  reflection: '',
  dateKey,
});

const FRIDAY = '2026-10-09';
const byId = (id: string) => WEEKLY_CHALLENGES.find((c) => c.id === id)!;

const sessions = [
  s('sketching', '2026-10-05', 20),
  s('origami', '2026-10-06', 30),
  s('journaling', '2026-10-06', 10),
  s('sketching', '2026-10-09', 15),
  s('crochet', '2026-10-04', 60), // last week, ignored
];

test('counts sessions, category minutes, distinct hobbies and days this week only', () => {
  expect(challengeProgress(byId('five-sessions'), sessions, FRIDAY)).toEqual({ value: 4, target: 5, done: false });
  expect(challengeProgress(byId('make-an-hour'), sessions, FRIDAY)).toEqual({ value: 60, target: 60, done: true });
  expect(challengeProgress(byId('try-three'), sessions, FRIDAY)).toEqual({ value: 3, target: 3, done: true });
  expect(challengeProgress(byId('four-days'), sessions, FRIDAY)).toEqual({ value: 3, target: 4, done: false });
});

test('progress never shows above the target', () => {
  const many = Array.from({ length: 9 }, (_, i) => s('rhythm', FRIDAY, 5 + i));
  expect(challengeProgress(byId('five-sessions'), many, FRIDAY).value).toBe(5);
});
