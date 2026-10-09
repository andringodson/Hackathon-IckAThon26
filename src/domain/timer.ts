// Elapsed time is derived from wall-clock timestamps, never from counting ticks,
// so a backgrounded or throttled JS timer cannot drift the result.

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerState {
  status: TimerStatus;
  targetMs: number;
  accumulatedMs: number;
  runningSince: number | null;
}

export const createTimer = (targetMinutes: number): TimerState => ({
  status: 'idle',
  targetMs: targetMinutes * 60_000,
  accumulatedMs: 0,
  runningSince: null,
});

export function elapsedMs(t: TimerState, now: number): number {
  // A clock moved backwards must not produce negative time.
  const live = t.runningSince === null ? 0 : Math.max(0, now - t.runningSince);
  return Math.min(t.targetMs, t.accumulatedMs + live);
}

export const remainingMs = (t: TimerState, now: number) => t.targetMs - elapsedMs(t, now);

export function start(t: TimerState, now: number): TimerState {
  if (t.status === 'running' || t.status === 'finished') return t;
  return { ...t, status: 'running', runningSince: now };
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.status !== 'running') return t;
  return { ...t, status: 'paused', accumulatedMs: elapsedMs(t, now), runningSince: null };
}

export const reset = (t: TimerState): TimerState => ({ ...t, status: 'idle', accumulatedMs: 0, runningSince: null });

/** Moves a running timer to `finished` once the target is reached. */
export function settle(t: TimerState, now: number): TimerState {
  if (t.status !== 'running' || elapsedMs(t, now) < t.targetMs) return t;
  return { ...t, status: 'finished', accumulatedMs: t.targetMs, runningSince: null };
}

/** Ms timestamp the running timer will hit its target, or null when not running. */
export const finishesAt = (t: TimerState, now: number) => (t.status === 'running' ? now + remainingMs(t, now) : null);

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
