// All day keys are local calendar days (YYYY-MM-DD) in the device time zone.
// Day arithmetic goes through the Date constructor so DST days stay one day long.

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime());
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const offset = (parseKey(key).getDay() + 6) % 7;
  return addDays(key, -offset);
}

/** Every day key from `from` to `to`, inclusive. */
export function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) days.push(k);
  return days;
}

export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(parseKey(key).getTime()) === key;
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDay(key: string): string {
  const d = parseKey(key);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekdayLetter(key: string): string {
  return WEEKDAYS[parseKey(key).getDay()][0];
}
