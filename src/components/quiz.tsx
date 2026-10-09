import type { ReactNode } from 'react';

import { ChipGroup, MultiChipGroup } from '@/components/ui/controls';
import { MATERIALS } from '@/domain/catalog';
import type { CoachAnswers } from '@/domain/ranking';
import { MINUTE_OPTIONS, type Interest } from '@/domain/types';

export const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: 'making', label: 'Making things' },
  { value: 'music', label: 'Music' },
  { value: 'movement', label: 'Moving' },
  { value: 'words', label: 'Words' },
  { value: 'nature', label: 'Outdoors' },
  { value: 'food', label: 'Food' },
  { value: 'mind', label: 'Puzzles and focus' },
  { value: 'tech', label: 'Tech' },
];

export const REMINDER_OPTIONS = [
  { value: '08:00', label: 'Morning' },
  { value: '13:00', label: 'Between classes' },
  { value: '19:00', label: 'Evening' },
  { value: '22:30', label: 'Late night' },
];

export const BASELINE_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4+ hours' },
];

export const TIME_OPTIONS = MINUTE_OPTIONS.map((m) => ({ value: m, label: `${m} min` }));

const BUDGET = [
  { value: 'free', label: 'Free' },
  { value: 'low', label: 'A little' },
  { value: 'flexible', label: 'Flexible' },
] as const;
const PLACE = [
  { value: 'indoor', label: 'Indoors' },
  { value: 'outdoor', label: 'Outdoors' },
  { value: 'either', label: 'Either' },
] as const;
const COMPANY = [
  { value: 'solo', label: 'On my own' },
  { value: 'social', label: 'With people' },
  { value: 'either', label: 'Either' },
] as const;
const SKILL = [
  { value: 'beginner', label: 'New to most things' },
  { value: 'experienced', label: 'Happy with a challenge' },
] as const;
const MATERIAL_OPTIONS = Object.entries(MATERIALS).map(([value, label]) => ({ value, label }));

export interface QuizStep {
  key: keyof CoachAnswers;
  question: string;
  multi?: boolean;
  render(a: CoachAnswers, set: (patch: Partial<CoachAnswers>) => void): ReactNode;
}

export const QUIZ: QuizStep[] = [
  {
    key: 'interests',
    question: 'What do you enjoy, even a little? Pick any.',
    multi: true,
    render: (a, set) => (
      <MultiChipGroup options={INTEREST_OPTIONS} value={a.interests} onChange={(interests) => set({ interests })} />
    ),
  },
  {
    key: 'availableMinutes',
    question: 'How much time do you usually have when you reach for your phone?',
    render: (a, set) => (
      <ChipGroup options={TIME_OPTIONS} value={a.availableMinutes} onChange={(availableMinutes) => set({ availableMinutes })} />
    ),
  },
  {
    key: 'budget',
    question: 'Should it cost anything?',
    render: (a, set) => <ChipGroup options={BUDGET} value={a.budget} onChange={(budget) => set({ budget })} />,
  },
  {
    key: 'place',
    question: 'Inside or out?',
    render: (a, set) => <ChipGroup options={PLACE} value={a.place} onChange={(place) => set({ place })} />,
  },
  {
    key: 'company',
    question: 'On your own, or with other people?',
    render: (a, set) => <ChipGroup options={COMPANY} value={a.company} onChange={(company) => set({ company })} />,
  },
  {
    key: 'skill',
    question: 'How do you like to start new things?',
    render: (a, set) => <ChipGroup options={SKILL} value={a.skill} onChange={(skill) => set({ skill })} />,
  },
  {
    key: 'materials',
    question: 'Anything already within reach?',
    multi: true,
    render: (a, set) => (
      <MultiChipGroup options={MATERIAL_OPTIONS} value={a.materials} onChange={(materials) => set({ materials })} />
    ),
  },
];

const label = (options: readonly { value: unknown; label: string }[], v: unknown) =>
  options.find((o) => o.value === v)?.label ?? String(v);

/** The user's answer to a step, written the way they would say it. */
export function answerText(step: QuizStep, a: CoachAnswers): string {
  switch (step.key) {
    case 'interests':
      return a.interests.length ? a.interests.map((i) => label(INTEREST_OPTIONS, i)).join(', ') : 'Not sure yet';
    case 'availableMinutes':
      return `About ${a.availableMinutes} minutes`;
    case 'budget':
      return label(BUDGET, a.budget);
    case 'place':
      return label(PLACE, a.place);
    case 'company':
      return label(COMPANY, a.company);
    case 'skill':
      return label(SKILL, a.skill);
    case 'materials':
      return a.materials.length ? a.materials.map((m) => label(MATERIAL_OPTIONS, m)).join(', ') : 'Nothing special';
  }
}
