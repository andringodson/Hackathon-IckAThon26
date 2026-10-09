import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalize, type Snapshot } from './snapshot';

const KEY = 'still:v1';

export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return normalize(null);
  }
}

/**
 * Latest-wins writer: at most one write in flight, and only the newest pending snapshot is
 * written next. Rapid taps never queue up stale writes or land out of order.
 */
export function createWriter(write: (json: string) => Promise<void> = (json) => AsyncStorage.setItem(KEY, json)) {
  let pending: Snapshot | null = null;
  let running: Promise<void> | null = null;

  async function drain() {
    while (pending) {
      const next = pending;
      pending = null;
      try {
        await write(JSON.stringify(next));
      } catch {
        // Keep the newest data queued for the next attempt rather than losing it.
        pending ??= next;
        return;
      }
    }
  }

  return {
    save(snapshot: Snapshot) {
      pending = snapshot;
      running ??= drain().finally(() => (running = null));
      return running;
    },
  };
}

export const clearLocal = () => AsyncStorage.removeItem(KEY);
