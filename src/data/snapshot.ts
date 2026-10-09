import { HOBBIES } from '@/domain/catalog';
import { INTERESTS, MINUTE_OPTIONS, type HobbySession, type Preferences, type ScrollLog } from '@/domain/types';

export interface ArenaState {
  joinedChallenges: string[];
  cheered: string[];
}

/** One pending remote write. The outbox replays these in order once the network is back. */
export type Op =
  | { type: 'preferences'; value: Preferences }
  | { type: 'session'; value: HobbySession }
  | { type: 'scrollLog'; value: ScrollLog }
  | { type: 'deleteScrollLog'; id: string }
  | { type: 'savedHobbies'; ids: string[] };

export interface Snapshot {
  version: 1;
  preferences: Preferences;
  sessions: HobbySession[];
  scrollLogs: ScrollLog[];
  savedHobbyIds: string[];
  currentHobbyId: string | null;
  arena: ArenaState;
  outbox: Op[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  name: '',
  interests: [],
  availableMinutes: 15,
  budget: 'free',
  place: 'either',
  company: 'either',
  skill: 'beginner',
  materials: [],
  reminderTimes: [],
  remindersOn: false,
  baselineDailyMinutes: null,
  dailyGoalMinutes: 15,
  privacyMode: false,
  shareProgress: false,
  leaderboardOptIn: false,
  aiConsent: false,
  theme: 'system',
  onboarded: false,
};

export const emptySnapshot = (): Snapshot => ({
  version: 1,
  preferences: DEFAULT_PREFERENCES,
  sessions: [],
  scrollLogs: [],
  savedHobbyIds: [],
  currentHobbyId: null,
  arena: { joinedChallenges: [], cheered: [] },
  outbox: [],
});

const arr = <T>(v: unknown, keep: (x: unknown) => x is T): T[] => (Array.isArray(v) ? v.filter(keep) : []);
const isStr = (x: unknown): x is string => typeof x === 'string';
const hobbyIds = new Set(HOBBIES.map((h) => h.id));

const isSession = (x: unknown): x is HobbySession => {
  const s = x as HobbySession;
  return !!s && isStr(s.id) && isStr(s.hobbyId) && isStr(s.dateKey) && Number.isFinite(s.durationMinutes);
};
const isLog = (x: unknown): x is ScrollLog => {
  const l = x as ScrollLog;
  return !!l && isStr(l.id) && isStr(l.dateKey) && Number.isInteger(l.minutes);
};

/**
 * Rebuilds a snapshot from stored JSON. Storage can hold data from an older build or a
 * half-written file, so every field falls back to a safe default instead of crashing the app.
 */
export function normalize(raw: unknown): Snapshot {
  const base = emptySnapshot();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Snapshot>;
  const p = { ...DEFAULT_PREFERENCES, ...(r.preferences ?? {}) };
  const preferences: Preferences = {
    ...p,
    interests: arr(p.interests, isStr).filter((i): i is Preferences['interests'][number] =>
      (INTERESTS as readonly string[]).includes(i),
    ),
    availableMinutes: (MINUTE_OPTIONS as readonly number[]).includes(p.availableMinutes)
      ? p.availableMinutes
      : DEFAULT_PREFERENCES.availableMinutes,
    materials: arr(p.materials, isStr),
    reminderTimes: arr(p.reminderTimes, isStr).filter((t) => /^\d{2}:\d{2}$/.test(t)),
  };
  return {
    version: 1,
    preferences,
    sessions: arr(r.sessions, isSession),
    scrollLogs: arr(r.scrollLogs, isLog),
    savedHobbyIds: arr(r.savedHobbyIds, isStr).filter((id) => hobbyIds.has(id)),
    currentHobbyId: isStr(r.currentHobbyId) && hobbyIds.has(r.currentHobbyId) ? r.currentHobbyId : null,
    arena: {
      joinedChallenges: arr(r.arena?.joinedChallenges, isStr),
      cheered: arr(r.arena?.cheered, isStr),
    },
    outbox: arr(r.outbox, (o): o is Op => !!o && typeof (o as Op).type === 'string'),
  };
}
