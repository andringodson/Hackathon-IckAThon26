import { dateKey, isValidKey } from './dates';
import { elapsedMs, type TimerState } from './timer';
import type { Hobby, HobbySession, ScrollLog } from './types';

export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 180;
export const MAX_REFLECTION = 500;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function completeSession(input: {
  id: string;
  hobby: Pick<Hobby, 'id' | 'title'>;
  timer: TimerState;
  startedAt: number;
  now: number;
  reflection: string;
  existing: HobbySession[];
}): Result<HobbySession> {
  const { id, hobby, timer, startedAt, now, reflection, existing } = input;
  if (existing.some((s) => s.id === id)) return { ok: false, error: 'This session is already saved.' };
  const minutes = Math.floor(elapsedMs(timer, now) / 60_000);
  if (minutes < MIN_SESSION_MINUTES) return { ok: false, error: 'Give it at least a minute before saving.' };
  if (minutes > MAX_SESSION_MINUTES || startedAt > now) return { ok: false, error: 'That session time looks wrong.' };
  return {
    ok: true,
    value: {
      id,
      hobbyId: hobby.id,
      hobbyTitle: hobby.title,
      startedAt,
      completedAt: now,
      durationMinutes: minutes,
      status: 'completed',
      reflection: reflection.trim().slice(0, MAX_REFLECTION),
      dateKey: dateKey(now),
    },
  };
}

export function validateScrollEntry(input: {
  minutes: string;
  dateKey: string;
  todayKey: string;
}): Result<{ minutes: number; dateKey: string }> {
  const raw = input.minutes.trim();
  if (!/^\d+$/.test(raw)) return { ok: false, error: 'Enter whole minutes, like 45.' };
  const minutes = Number(raw);
  if (minutes > 1440) return { ok: false, error: 'A day only has 1440 minutes.' };
  if (!isValidKey(input.dateKey)) return { ok: false, error: 'Pick a valid day.' };
  if (input.dateKey > input.todayKey) return { ok: false, error: 'You can only log today or earlier.' };
  return { ok: true, value: { minutes, dateKey: input.dateKey } };
}

export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  return i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
}

export const sortLogs = (logs: ScrollLog[]) =>
  [...logs].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.createdAt - a.createdAt);
