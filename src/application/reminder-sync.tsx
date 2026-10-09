import { useEffect } from 'react';

import { HOBBIES } from '@/domain/catalog';
import { cancelReminders, scheduleReminders } from '@/infrastructure/notifications';

import { useStore } from './store';

/** Keeps scheduled nudges in step with reminder settings and the chosen hobby. Renders nothing. */
export function ReminderSync() {
  const { snapshot } = useStore();
  const { remindersOn, reminderTimes, onboarded } = snapshot.preferences;
  const hobby = HOBBIES.find((h) => h.id === snapshot.currentHobbyId)?.title ?? null;
  const times = reminderTimes.join(',');

  useEffect(() => {
    const work = remindersOn && onboarded && times ? scheduleReminders(times.split(','), hobby) : cancelReminders();
    work.catch(() => {});
  }, [remindersOn, onboarded, times, hobby]);

  return null;
}
