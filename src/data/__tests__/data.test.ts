import type { HobbySession, ScrollLog } from '@/domain/types';

import { createWriter } from '../local';
import { DEFAULT_PREFERENCES, emptySnapshot, normalize, type Op } from '../snapshot';
import { enqueue, flush, mergeRemote, type RemoteProvider } from '../sync';

const session = (id: string): HobbySession => ({
  id,
  hobbyId: 'sketching',
  hobbyTitle: 'Pocket sketching',
  startedAt: 0,
  completedAt: 60_000,
  durationMinutes: 1,
  status: 'completed',
  reflection: '',
  dateKey: '2026-10-09',
});
const log = (id: string): ScrollLog => ({ id, dateKey: '2026-10-09', minutes: 30, source: 'manual', note: '', createdAt: 0 });

describe('normalize', () => {
  test('survives garbage and old shapes', () => {
    expect(normalize('nope')).toEqual(emptySnapshot());
    const s = normalize({
      preferences: { availableMinutes: 7, interests: ['music', 'skydiving'], reminderTimes: ['21:00', 'late'] },
      sessions: [session('a'), { id: 1 }],
      savedHobbyIds: ['sketching', 'removed-hobby'],
      currentHobbyId: 'removed-hobby',
    });
    expect(s.preferences.availableMinutes).toBe(15);
    expect(s.preferences.interests).toEqual(['music']);
    expect(s.preferences.reminderTimes).toEqual(['21:00']);
    expect(s.sessions).toHaveLength(1);
    expect(s.savedHobbyIds).toEqual(['sketching']);
    expect(s.currentHobbyId).toBeNull();
  });
});

describe('outbox', () => {
  test('enqueue keeps only the newest preferences and drops writes a delete cancels', () => {
    let box: Op[] = [];
    box = enqueue(box, { type: 'preferences', value: DEFAULT_PREFERENCES });
    box = enqueue(box, { type: 'scrollLog', value: log('l1') });
    box = enqueue(box, { type: 'preferences', value: { ...DEFAULT_PREFERENCES, name: 'Priya' } });
    box = enqueue(box, { type: 'deleteScrollLog', id: 'l1' });
    expect(box.map((o) => o.type)).toEqual(['preferences', 'deleteScrollLog']);
    expect(box[0].type === 'preferences' && box[0].value.name).toBe('Priya');
  });

  test('flush stops at the first failure and keeps the rest in order', async () => {
    const applied: string[] = [];
    const remote: RemoteProvider = {
      pull: jest.fn(),
      deleteAll: jest.fn(),
      apply: async (op) => {
        if (op.type === 'session' && op.value.id === 'bad') throw new Error('offline');
        applied.push(op.type === 'session' ? op.value.id : op.type);
      },
    };
    const ops: Op[] = [
      { type: 'session', value: session('a') },
      { type: 'session', value: session('bad') },
      { type: 'session', value: session('c') },
    ];
    const left = await flush(remote, ops);
    expect(applied).toEqual(['a']);
    expect(left).toEqual(ops.slice(1));
  });
});

describe('mergeRemote', () => {
  test('keeps guest progress and uploads only what the server lacks', () => {
    const local = {
      ...emptySnapshot(),
      preferences: { ...DEFAULT_PREFERENCES, theme: 'dark' as const, name: 'Guest' },
      sessions: [session('shared'), session('guest')],
      scrollLogs: [log('guest-log')],
      savedHobbyIds: ['sketching'],
    };
    const { snapshot, upload } = mergeRemote(local, {
      preferences: { ...DEFAULT_PREFERENCES, name: 'Priya', theme: 'light' },
      sessions: [session('shared'), session('server')],
      scrollLogs: [],
      savedHobbyIds: ['sketching'],
    });
    expect(snapshot.sessions.map((s) => s.id).sort()).toEqual(['guest', 'server', 'shared']);
    expect(snapshot.preferences.name).toBe('Priya');
    expect(snapshot.preferences.theme).toBe('dark');
    expect(upload.map((o) => (o.type === 'session' || o.type === 'scrollLog' ? o.value.id : o.type))).toEqual([
      'guest',
      'guest-log',
    ]);
  });

  test('a new account receives the guest preferences', () => {
    const { upload } = mergeRemote(emptySnapshot(), { preferences: null, sessions: [], scrollLogs: [], savedHobbyIds: [] });
    expect(upload[0].type).toBe('preferences');
  });
});

describe('createWriter', () => {
  test('writes the newest snapshot last and skips stale ones', async () => {
    const written: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const writer = createWriter(async (json) => {
      if (!written.length) await gate;
      written.push(JSON.parse(json).preferences.name);
    });
    const name = (n: string) => ({ ...emptySnapshot(), preferences: { ...DEFAULT_PREFERENCES, name: n } });
    const done = writer.save(name('one'));
    writer.save(name('two'));
    writer.save(name('three'));
    release();
    await done;
    expect(written).toEqual(['one', 'three']);
  });

  test('a failed write keeps the data for the next save', async () => {
    let fail = true;
    const written: string[] = [];
    const writer = createWriter(async (json) => {
      if (fail) throw new Error('disk full');
      written.push(JSON.parse(json).preferences.name);
    });
    await writer.save({ ...emptySnapshot(), preferences: { ...DEFAULT_PREFERENCES, name: 'kept' } });
    fail = false;
    await writer.save({ ...emptySnapshot(), preferences: { ...DEFAULT_PREFERENCES, name: 'newer' } });
    expect(written).toEqual(['newer']);
  });
});
