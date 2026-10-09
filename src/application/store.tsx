import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { clearLocal, createWriter, loadSnapshot } from '@/data/local';
import { emptySnapshot, type Op, type Snapshot } from '@/data/snapshot';
import { enqueue, flush, mergeRemote, type RemoteProvider } from '@/data/sync';
import { HOBBIES } from '@/domain/catalog';
import { upsertById } from '@/domain/sessions';
import type { HobbySession, Preferences, ScrollLog } from '@/domain/types';
import { supabase } from '@/infrastructure/supabase';
import { supabaseProvider } from '@/infrastructure/supabase-provider';

export interface Account {
  id: string;
  email: string;
}

interface Data {
  ready: boolean;
  snapshot: Snapshot;
  account: Account | null;
}

export interface Actions {
  updatePreferences(patch: Partial<Preferences>): void;
  setCurrentHobby(id: string | null): void;
  toggleSaved(id: string): void;
  addSession(session: HobbySession): void;
  saveScrollLog(log: ScrollLog): void;
  deleteScrollLog(id: string): void;
  toggleChallenge(id: string): void;
  toggleCheer(id: string): void;
  resetEverything(): Promise<void>;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  /** Returns the number of unsynced changes instead of signing out, unless forced. */
  signOut(force?: boolean): Promise<number>;
}

const DataContext = createContext<Data | null>(null);
const ActionsContext = createContext<Actions | null>(null);

const titles = new Map(HOBBIES.map((h) => [h.id, h.title]));
const toAccount = (s: Session | null): Account | null => (s ? { id: s.user.id, email: s.user.email ?? '' } : null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>({ ready: false, snapshot: emptySnapshot(), account: null });
  const current = useRef<Snapshot>(data.snapshot);
  const remote = useRef<RemoteProvider | null>(null);
  const flushing = useRef(false);
  const unmerged = useRef<Account | null>(null);
  const [writer] = useState(createWriter);

  // The single write path: memory first (instant UI), then disk, then the server outbox.
  function commit(change: (s: Snapshot) => Snapshot, op?: Op) {
    let next = change(current.current);
    if (op && remote.current) next = { ...next, outbox: enqueue(next.outbox, op) };
    current.current = next;
    setData((d) => ({ ...d, ready: true, snapshot: next }));
    writer.save(next);
    if (op && remote.current) void drain();
  }

  async function drain() {
    if (flushing.current || !remote.current) return;
    flushing.current = true;
    try {
      while (current.current.outbox.length) {
        const batch = current.current.outbox;
        const left = await flush(remote.current, batch);
        const done = batch.length - left.length;
        // Ops queued while the batch was in flight stay behind the ones that failed.
        commit((s) => ({ ...s, outbox: s.outbox.slice(done) }));
        if (left.length) break;
      }
    } finally {
      flushing.current = false;
    }
  }

  async function connect(account: Account) {
    if (!supabase) return;
    const provider = supabaseProvider(supabase, account.id, titles);
    remote.current = provider;
    unmerged.current = account;
    try {
      const { snapshot, upload } = mergeRemote(current.current, await provider.pull());
      commit(() => ({ ...snapshot, outbox: upload.reduce(enqueue, snapshot.outbox) }));
      unmerged.current = null;
    } catch {
      // Offline at sign-in: keep working locally; the next return to the app retries the merge.
      return;
    }
    void drain();
  }

  useEffect(() => {
    let alive = true;
    const loaded = loadSnapshot().then((snapshot) => {
      if (!alive) return;
      current.current = snapshot;
      setData((d) => ({ ...d, ready: true, snapshot }));
    });

    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      const account = toAccount(session);
      setData((d) => ({ ...d, account }));
      if (!account) remote.current = null;
      else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Merge only after local data has loaded, so nothing on disk is overwritten.
        void loaded.then(() => connect(account));
      }
    });

    const appState = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      if (unmerged.current) void connect(unmerged.current);
      else void drain();
    });
    return () => {
      alive = false;
      sub?.data.subscription.unsubscribe();
      appState.remove();
    };
    // Runs once: commit/connect read refs, not render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actions: Actions = {
    updatePreferences(patch) {
      commit(
        (s) => ({ ...s, preferences: { ...s.preferences, ...patch } }),
        { type: 'preferences', value: { ...current.current.preferences, ...patch } },
      );
    },
    setCurrentHobby(id) {
      commit((s) => ({ ...s, currentHobbyId: id }));
    },
    toggleSaved(id) {
      const ids = current.current.savedHobbyIds;
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      commit((s) => ({ ...s, savedHobbyIds: next }), { type: 'savedHobbies', ids: next });
    },
    addSession(session) {
      if (current.current.sessions.some((s) => s.id === session.id)) return;
      commit((s) => ({ ...s, sessions: [...s.sessions, session] }), { type: 'session', value: session });
    },
    saveScrollLog(log) {
      commit((s) => ({ ...s, scrollLogs: upsertById(s.scrollLogs, log) }), { type: 'scrollLog', value: log });
    },
    deleteScrollLog(id) {
      commit((s) => ({ ...s, scrollLogs: s.scrollLogs.filter((l) => l.id !== id) }), { type: 'deleteScrollLog', id });
    },
    toggleChallenge(id) {
      commit((s) => {
        const j = s.arena.joinedChallenges;
        return { ...s, arena: { ...s.arena, joinedChallenges: j.includes(id) ? j.filter((x) => x !== id) : [...j, id] } };
      });
    },
    toggleCheer(id) {
      commit((s) => {
        const c = s.arena.cheered;
        return { ...s, arena: { ...s.arena, cheered: c.includes(id) ? c.filter((x) => x !== id) : [...c, id] } };
      });
    },
    async resetEverything() {
      if (remote.current) await remote.current.deleteAll();
      await clearLocal();
      const theme = current.current.preferences.theme;
      commit(() => ({ ...emptySnapshot(), preferences: { ...emptySnapshot().preferences, theme } }));
    },
    async signIn(email, password) {
      if (!supabase) return 'Accounts are not set up in this build.';
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? error.message : null;
    },
    async signUp(email, password) {
      if (!supabase) return 'Accounts are not set up in this build.';
      const { data: res, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return error.message;
      return res.session ? null : 'Check your inbox to confirm your email, then sign in.';
    },
    async signOut(force) {
      await drain();
      const pending = current.current.outbox.length;
      if (pending && !force) return pending;
      await supabase?.auth.signOut();
      remote.current = null;
      unmerged.current = null;
      // Account data stays in the account; this phone goes back to a clean guest state.
      await clearLocal();
      const theme = current.current.preferences.theme;
      commit(() => ({ ...emptySnapshot(), preferences: { ...emptySnapshot().preferences, theme } }));
      return 0;
    },
  };
  // Actions only touch refs and setters, so the first instance stays correct for the app's lifetime.
  // Keeping it stable means components that only call actions never re-render on data changes.
  const [stableActions] = useState<Actions>(() => actions);

  return (
    <ActionsContext value={stableActions}>
      <DataContext value={data}>{children}</DataContext>
    </ActionsContext>
  );
}

export function useStore() {
  const value = use(DataContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function useActions() {
  const value = use(ActionsContext);
  if (!value) throw new Error('useActions must be used inside StoreProvider');
  return value;
}
