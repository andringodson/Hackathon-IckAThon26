import { addDays, dateKey, daysInRange, formatMinutes, isValidKey, weekStart } from '../dates';

test('runs in a time zone with daylight saving', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
});

test('dateKey uses the local calendar day, not UTC', () => {
  // 23:30 local on 9 Oct is already 10 Oct in UTC.
  expect(dateKey(new Date(2026, 9, 9, 23, 30).getTime())).toBe('2026-10-09');
});

test('addDays stays on calendar days across DST changes', () => {
  expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
  expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});

test('weekStart is Monday', () => {
  expect(weekStart('2026-10-09')).toBe('2026-10-05'); // Friday
  expect(weekStart('2026-10-05')).toBe('2026-10-05'); // Monday
  expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
});

test('daysInRange is inclusive', () => {
  expect(daysInRange('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
});

test('isValidKey rejects impossible dates', () => {
  expect(isValidKey('2026-02-29')).toBe(false);
  expect(isValidKey('2026-13-01')).toBe(false);
  expect(isValidKey('2026-1-1')).toBe(false);
  expect(isValidKey('2028-02-29')).toBe(true);
});

test('formatMinutes', () => {
  expect(formatMinutes(0)).toBe('0 min');
  expect(formatMinutes(45)).toBe('45 min');
  expect(formatMinutes(60)).toBe('1h');
  expect(formatMinutes(135)).toBe('2h 15m');
});
