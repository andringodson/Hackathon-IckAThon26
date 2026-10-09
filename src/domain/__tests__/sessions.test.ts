import { completeSession, upsertById, validateScrollEntry } from '../sessions';
import { createTimer, pause, start } from '../timer';

const MIN = 60_000;
const t0 = new Date(2026, 9, 9, 21, 0).getTime();
const hobby = { id: 'sketching', title: 'Pocket sketching' };

const finish = (minutes: number, existing = [] as never[]) =>
  completeSession({
    id: 's1',
    hobby,
    timer: start(createTimer(15), t0),
    startedAt: t0,
    now: t0 + minutes * MIN,
    reflection: '  felt good  ',
    existing,
  });

test('saves real elapsed minutes and the local day', () => {
  const r = finish(12.5);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.durationMinutes).toBe(12);
  expect(r.value.dateKey).toBe('2026-10-09');
  expect(r.value.reflection).toBe('felt good');
});

test('caps at the timer target even if saved much later', () => {
  const r = finish(90);
  expect(r.ok && r.value.durationMinutes).toBe(15);
});

test('starting a timer is not a completed session', () => {
  expect(finish(0.5)).toEqual({ ok: false, error: 'Give it at least a minute before saving.' });
});

test('rejects a duplicate completion of the same session', () => {
  const first = finish(10);
  if (!first.ok) throw new Error('setup');
  const again = completeSession({
    id: 's1',
    hobby,
    timer: pause(start(createTimer(15), t0), t0 + 10 * MIN),
    startedAt: t0,
    now: t0 + 11 * MIN,
    reflection: '',
    existing: [first.value],
  });
  expect(again.ok).toBe(false);
});

test('rejects a start time in the future', () => {
  const r = completeSession({
    id: 's2',
    hobby,
    timer: start(createTimer(15), t0 - 5 * MIN),
    startedAt: t0 + MIN,
    now: t0,
    reflection: '',
    existing: [],
  });
  expect(r.ok).toBe(false);
});

describe('validateScrollEntry', () => {
  const today = '2026-10-09';
  test.each([
    ['45', today, true],
    ['0', today, true],
    ['1440', '2026-10-01', true],
    ['1441', today, false],
    ['-5', today, false],
    ['4.5', today, false],
    ['', today, false],
    ['abc', today, false],
    ['30', '2026-10-10', false],
    ['30', '2026-02-30', false],
  ])('%s on %s -> %s', (minutes, key, ok) => {
    expect(validateScrollEntry({ minutes, dateKey: key, todayKey: today }).ok).toBe(ok);
  });
});

test('upsertById replaces in place or appends', () => {
  const list = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
  expect(upsertById(list, { id: 'a', v: 9 })).toEqual([{ id: 'a', v: 9 }, { id: 'b', v: 2 }]);
  expect(upsertById(list, { id: 'c', v: 3 })).toHaveLength(3);
});
