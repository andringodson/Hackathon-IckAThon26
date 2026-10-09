import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dateKey } from '@/domain/dates';

/** Today's local day key. Updates at midnight and when the app returns to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(Date.now()));

  useEffect(() => {
    const refresh = () => setToday(dateKey(Date.now()));
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(refresh, msToMidnight + 1000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [today]);

  return today;
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const INTENTIONS = [
  'Make a little room for yourself.',
  'A small start still counts.',
  "You don't need an hour. Start with fifteen minutes.",
  'Your time is yours.',
  'What would you like to try today?',
  'One thing, done slowly, is enough.',
  'Put the phone down for one small thing.',
];

/** Same line all day, a different one tomorrow. */
export function intentionFor(key: string): string {
  const n = [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return INTENTIONS[n % INTENTIONS.length];
}
