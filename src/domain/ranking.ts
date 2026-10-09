import { MATERIALS, type Material } from './catalog';
import type { Budget, Hobby, Interest, Preferences, Recommendation } from './types';

export type CoachAnswers = Pick<
  Preferences,
  'interests' | 'availableMinutes' | 'budget' | 'place' | 'company' | 'skill' | 'materials'
>;

const BUDGET_RANK: Record<Budget, number> = { free: 0, low: 1, flexible: 2 };

export function isCompatible(hobby: Hobby, a: CoachAnswers): boolean {
  return (
    hobby.minMinutes <= a.availableMinutes &&
    BUDGET_RANK[hobby.cost] <= BUDGET_RANK[a.budget] &&
    (a.place === 'either' || hobby.place === 'either' || hobby.place === a.place) &&
    (a.company === 'either' || hobby.company === 'either' || hobby.company === a.company) &&
    !(a.skill === 'beginner' && hobby.forSkill === 'experienced')
  );
}

const hasMaterials = (hobby: Hobby, owned: string[]) => hobby.materials.every((m) => owned.includes(m));

export function scoreHobby(hobby: Hobby, a: CoachAnswers): number {
  let score = 0;
  if (a.interests.includes(hobby.category)) score += 6;
  if (hasMaterials(hobby, a.materials)) score += hobby.materials.length ? 3 : 2;
  if (hobby.cost === a.budget) score += 1;
  if (a.place !== 'either' && hobby.place === a.place) score += 1;
  if (a.company !== 'either' && hobby.company === a.company) score += 1;
  if (a.skill === 'experienced' && hobby.difficulty === 'stretch') score += 1;
  if (a.skill === 'beginner' && hobby.difficulty === 'easy') score += 1;
  // Prefer hobbies that use most of the time the user has, not a fraction of it.
  score += hobby.minMinutes / a.availableMinutes;
  return score;
}

const INTEREST_WORDS: Record<Interest, string> = {
  making: 'making things',
  music: 'music',
  movement: 'moving',
  words: 'words',
  nature: 'being outside',
  food: 'food',
  mind: 'puzzles and focus',
  tech: 'technology',
};

export function explain(hobby: Hobby, a: CoachAnswers): string {
  const parts: string[] = [];
  if (a.interests.includes(hobby.category)) parts.push(`you said you like ${INTEREST_WORDS[hobby.category]}`);
  parts.push(`a first session fits in ${a.availableMinutes} minutes`);
  parts.push(hobby.cost === 'free' ? 'it costs nothing' : hobby.costNote.toLowerCase());
  if (hobby.materials.length && hasMaterials(hobby, a.materials)) {
    parts.push(`you already have ${MATERIALS[hobby.materials[0] as Material].toLowerCase()}`);
  }
  const sentence = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return sentence[0].toUpperCase() + sentence.slice(1) + '.';
}

export function rankHobbies(catalog: Hobby[], a: CoachAnswers): Hobby[] {
  return catalog
    .filter((h) => isCompatible(h, a))
    .map((h) => ({ h, s: scoreHobby(h, a) }))
    .sort((x, y) => y.s - x.s || x.h.id.localeCompare(y.h.id))
    .map((x) => x.h);
}

/**
 * Three distinct suggestions, one per category where possible.
 * `exclude` holds ids already shown, so "show me others" moves down the list.
 */
export function pickThree(ranked: Hobby[], exclude: string[] = []): Hobby[] {
  const fresh = ranked.filter((h) => !exclude.includes(h.id));
  const pool = fresh.length >= 3 ? fresh : [...fresh, ...ranked.filter((h) => exclude.includes(h.id))];
  const picked: Hobby[] = [];
  for (const h of pool) if (picked.length < 3 && !picked.some((p) => p.category === h.category)) picked.push(h);
  for (const h of pool) if (picked.length < 3 && !picked.includes(h)) picked.push(h);
  return picked;
}

export function localRecommendations(catalog: Hobby[], a: CoachAnswers, exclude: string[] = []): Recommendation[] {
  return pickThree(rankHobbies(catalog, a), exclude).map((hobby) => ({
    hobby,
    reason: explain(hobby, a),
    starterTask: hobby.starter.title,
    steps: hobby.starter.steps,
    source: 'local',
  }));
}
