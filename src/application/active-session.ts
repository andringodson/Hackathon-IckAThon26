import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { createTimer, type TimerState } from '@/domain/timer';

/** The in-progress activity, persisted on every change so a killed app resumes where it was. */
export interface ActiveSession {
  id: string;
  hobbyId: string;
  startedAt: number | null;
  timer: TimerState;
  checked: number[];
}

const KEY = 'still:active';

export const newActive = (hobbyId: string, minutes = 15): ActiveSession => ({
  id: randomUUID(),
  hobbyId,
  startedAt: null,
  timer: createTimer(minutes),
  checked: [],
});

export async function loadActive(): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const a = raw ? (JSON.parse(raw) as ActiveSession) : null;
    return a && typeof a.id === 'string' && a.timer && typeof a.timer.targetMs === 'number' ? a : null;
  } catch {
    return null;
  }
}

export const saveActive = (a: ActiveSession) => AsyncStorage.setItem(KEY, JSON.stringify(a)).catch(() => {});
export const clearActive = () => AsyncStorage.removeItem(KEY).catch(() => {});

/** True when leaving this session would throw away time the user has spent. */
export const hasProgress = (a: ActiveSession) => a.timer.status !== 'idle' || a.timer.accumulatedMs > 0;
