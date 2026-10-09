export const INTERESTS = [
  'making',
  'music',
  'movement',
  'words',
  'nature',
  'food',
  'mind',
  'tech',
] as const;
export type Interest = (typeof INTERESTS)[number];

export const MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;
export type AvailableMinutes = (typeof MINUTE_OPTIONS)[number];

export type Budget = 'free' | 'low' | 'flexible';
export type Place = 'indoor' | 'outdoor' | 'either';
export type Company = 'solo' | 'social' | 'either';
export type Skill = 'beginner' | 'experienced';
export type Difficulty = 'easy' | 'steady' | 'stretch';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  name: string;
  interests: Interest[];
  availableMinutes: AvailableMinutes;
  budget: Budget;
  place: Place;
  company: Company;
  skill: Skill;
  materials: string[];
  /** Local times in HH:MM. */
  reminderTimes: string[];
  remindersOn: boolean;
  /** Self-reported unplanned scrolling on a typical day, in minutes. */
  baselineDailyMinutes: number | null;
  dailyGoalMinutes: number;
  privacyMode: boolean;
  shareProgress: boolean;
  leaderboardOptIn: boolean;
  aiConsent: boolean;
  theme: ThemePreference;
  onboarded: boolean;
}

export interface Hobby {
  id: string;
  title: string;
  category: Interest;
  description: string;
  difficulty: Difficulty;
  cost: Budget;
  costNote: string;
  minMinutes: number;
  place: Place;
  company: Company;
  forSkill: Skill | 'any';
  materials: string[];
  starter: { title: string; steps: string[] };
}

export interface Recommendation {
  hobby: Hobby;
  reason: string;
  starterTask: string;
  steps: string[];
  source: 'local' | 'ai';
}

export interface HobbySession {
  id: string;
  hobbyId: string;
  hobbyTitle: string;
  startedAt: number;
  completedAt: number;
  durationMinutes: number;
  status: 'completed';
  reflection: string;
  /** Local calendar day the session finished on, YYYY-MM-DD. */
  dateKey: string;
}

export interface ScrollLog {
  id: string;
  dateKey: string;
  minutes: number;
  source: 'manual';
  note: string;
  createdAt: number;
}
