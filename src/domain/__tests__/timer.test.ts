import { createTimer, elapsedMs, finishesAt, formatClock, pause, remainingMs, reset, settle, start } from '../timer';

const MIN = 60_000;

test('counts from timestamps across pause and resume', () => {
  let t = createTimer(15);
  t = start(t, 0);
  expect(elapsedMs(t, 2 * MIN)).toBe(2 * MIN);
  t = pause(t, 2 * MIN);
  // Paused time does not count, however long it lasts.
  expect(elapsedMs(t, 60 * MIN)).toBe(2 * MIN);
  t = start(t, 60 * MIN);
  expect(elapsedMs(t, 63 * MIN)).toBe(5 * MIN);
  expect(remainingMs(t, 63 * MIN)).toBe(10 * MIN);
});

test('restores correctly after the app was killed while running', () => {
  const saved = JSON.parse(JSON.stringify(start(createTimer(15), 1_000)));
  expect(elapsedMs(saved, 1_000 + 7 * MIN)).toBe(7 * MIN);
});

test('never exceeds the target and settles to finished', () => {
  let t = start(createTimer(15), 0);
  expect(elapsedMs(t, 99 * MIN)).toBe(15 * MIN);
  expect(settle(t, 14 * MIN).status).toBe('running');
  t = settle(t, 16 * MIN);
  expect(t.status).toBe('finished');
  expect(start(t, 17 * MIN)).toBe(t);
});

test('a clock moved backwards does not give negative time', () => {
  const t = start(createTimer(15), 10 * MIN);
  expect(elapsedMs(t, 5 * MIN)).toBe(0);
});

test('double start and double pause are no-ops', () => {
  const t = start(createTimer(15), 0);
  expect(start(t, 5 * MIN)).toBe(t);
  const p = pause(t, MIN);
  expect(pause(p, 2 * MIN)).toBe(p);
});

test('reset clears progress', () => {
  const t = reset(pause(start(createTimer(10), 0), 3 * MIN));
  expect(t.status).toBe('idle');
  expect(elapsedMs(t, 99 * MIN)).toBe(0);
});

test('finishesAt is only set while running', () => {
  const t = start(createTimer(15), 0);
  expect(finishesAt(t, 5 * MIN)).toBe(15 * MIN);
  expect(finishesAt(pause(t, 5 * MIN), 6 * MIN)).toBeNull();
});

test('formatClock rounds up to whole seconds', () => {
  expect(formatClock(15 * MIN)).toBe('15:00');
  expect(formatClock(61_001)).toBe('1:02');
  expect(formatClock(0)).toBe('0:00');
});
