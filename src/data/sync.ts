import type { HobbySession, Preferences, ScrollLog } from '@/domain/types';

import type { Op, Snapshot } from './snapshot';

/** What a signed-in account holds on the server. Mirrors the Refine data-provider idea: one interface, swappable backends. */
export interface RemoteData {
  preferences: Preferences | null;
  sessions: HobbySession[];
  scrollLogs: ScrollLog[];
  savedHobbyIds: string[];
}

export interface RemoteProvider {
  pull(): Promise<RemoteData>;
  apply(op: Op): Promise<void>;
  deleteAll(): Promise<void>;
}

/** Queues an op, dropping older ops it makes pointless so the outbox stays small offline. */
export function enqueue(outbox: Op[], op: Op): Op[] {
  const superseded = (o: Op) =>
    (op.type === 'preferences' && o.type === 'preferences') ||
    (op.type === 'savedHobbies' && o.type === 'savedHobbies') ||
    (op.type === 'scrollLog' && o.type === 'scrollLog' && o.value.id === op.value.id) ||
    (op.type === 'deleteScrollLog' && o.type === 'scrollLog' && o.value.id === op.id);
  return [...outbox.filter((o) => !superseded(o)), op];
}

/** Applies ops in order and stops at the first failure, so later writes never overtake earlier ones. */
export async function flush(remote: RemoteProvider, outbox: Op[]): Promise<Op[]> {
  for (let i = 0; i < outbox.length; i++) {
    try {
      await remote.apply(outbox[i]);
    } catch {
      return outbox.slice(i);
    }
  }
  return [];
}

/**
 * Combines device data with an account after sign-in. Records are unioned by id, so guest
 * progress is kept. Server preferences win, except the theme, which belongs to this device.
 * Returns the merged snapshot and the ops that upload what only this device had.
 */
export function mergeRemote(local: Snapshot, remote: RemoteData): { snapshot: Snapshot; upload: Op[] } {
  const ids = <T extends { id: string }>(list: T[]) => new Set(list.map((x) => x.id));
  const remoteSessionIds = ids(remote.sessions);
  const remoteLogIds = ids(remote.scrollLogs);
  const localOnlySessions = local.sessions.filter((s) => !remoteSessionIds.has(s.id));
  const localOnlyLogs = local.scrollLogs.filter((l) => !remoteLogIds.has(l.id));
  const savedHobbyIds = [...new Set([...remote.savedHobbyIds, ...local.savedHobbyIds])];

  const preferences = remote.preferences
    ? { ...remote.preferences, theme: local.preferences.theme, onboarded: true }
    : local.preferences;

  const upload: Op[] = [
    ...(remote.preferences ? [] : [{ type: 'preferences' as const, value: local.preferences }]),
    ...localOnlySessions.map((value) => ({ type: 'session' as const, value })),
    ...localOnlyLogs.map((value) => ({ type: 'scrollLog' as const, value })),
    ...(savedHobbyIds.length !== remote.savedHobbyIds.length ? [{ type: 'savedHobbies' as const, ids: savedHobbyIds }] : []),
  ];

  return {
    snapshot: {
      ...local,
      preferences,
      sessions: [...remote.sessions, ...localOnlySessions],
      scrollLogs: [...remote.scrollLogs, ...localOnlyLogs],
      savedHobbyIds,
    },
    upload,
  };
}
