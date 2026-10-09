import { HOBBIES } from '../catalog';
import { isCompatible, localRecommendations, pickThree, rankHobbies, type CoachAnswers } from '../ranking';

const base: CoachAnswers = {
  interests: ['music'],
  availableMinutes: 15,
  budget: 'free',
  place: 'either',
  company: 'either',
  skill: 'beginner',
  materials: [],
};

test('never suggests something longer than the time available', () => {
  for (const minutes of [5, 10, 15, 30, 60] as const) {
    const ranked = rankHobbies(HOBBIES, { ...base, availableMinutes: minutes });
    expect(ranked.every((h) => h.minMinutes <= minutes)).toBe(true);
  }
});

test('never suggests something above budget', () => {
  expect(rankHobbies(HOBBIES, base).every((h) => h.cost === 'free')).toBe(true);
  const low = rankHobbies(HOBBIES, { ...base, budget: 'low', availableMinutes: 60 });
  expect(low.some((h) => h.cost === 'low')).toBe(true);
  expect(low.some((h) => h.cost === 'flexible')).toBe(false);
});

test('respects indoor, solo and beginner limits', () => {
  const a: CoachAnswers = { ...base, place: 'indoor', company: 'solo', availableMinutes: 60, budget: 'flexible' };
  const ranked = rankHobbies(HOBBIES, a);
  expect(ranked.some((h) => h.place === 'outdoor' || h.company === 'social')).toBe(false);
  expect(ranked.some((h) => h.forSkill === 'experienced')).toBe(false);
});

test('ranks matching interests first', () => {
  expect(rankHobbies(HOBBIES, base)[0].category).toBe('music');
});

test('owned materials lift a hobby', () => {
  const without = rankHobbies(HOBBIES, { ...base, interests: [] });
  const withHeadphones = rankHobbies(HOBBIES, { ...base, interests: [], materials: ['headphones'] });
  const idx = (list: typeof without) => list.findIndex((h) => h.id === 'active-listening');
  expect(idx(withHeadphones)).toBeLessThan(idx(without));
});

test('is deterministic', () => {
  expect(rankHobbies(HOBBIES, base).map((h) => h.id)).toEqual(rankHobbies(HOBBIES, base).map((h) => h.id));
});

test('picks three distinct categories when it can', () => {
  const picked = pickThree(rankHobbies(HOBBIES, { ...base, availableMinutes: 60, budget: 'flexible' }));
  expect(picked).toHaveLength(3);
  expect(new Set(picked.map((h) => h.category)).size).toBe(3);
});

test('refresh skips what was already shown, then wraps around', () => {
  const ranked = rankHobbies(HOBBIES, base);
  const first = pickThree(ranked).map((h) => h.id);
  const second = pickThree(ranked, first).map((h) => h.id);
  expect(second.some((id) => first.includes(id))).toBe(false);
  const all = ranked.map((h) => h.id);
  expect(pickThree(ranked, all)).toHaveLength(3);
});

test('isCompatible treats "either" as a wildcard on both sides', () => {
  const walk = HOBBIES.find((h) => h.id === 'photo-walk')!;
  expect(isCompatible(walk, { ...base, place: 'indoor' })).toBe(false);
  expect(isCompatible(walk, { ...base, place: 'either' })).toBe(true);
});

test('local recommendations carry a reason and a starter task', () => {
  const recs = localRecommendations(HOBBIES, base);
  expect(recs).toHaveLength(3);
  for (const r of recs) {
    expect(r.reason).toMatch(/\.$/);
    expect(r.starterTask.length).toBeGreaterThan(0);
    expect(r.source).toBe('local');
  }
  expect(recs[0].reason).toMatch(/^You said you like music/);
});

test('catalog ids are unique', () => {
  expect(new Set(HOBBIES.map((h) => h.id)).size).toBe(HOBBIES.length);
});
