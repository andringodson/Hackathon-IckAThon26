import type { CoachAnswers } from '@/domain/ranking';

import { getRecommendations } from '../coach';

const answers: CoachAnswers = {
  interests: ['words'],
  availableMinutes: 15,
  budget: 'free',
  place: 'either',
  company: 'either',
  skill: 'beginner',
  materials: ['paper'],
};

test('without AI it returns deterministic local suggestions', async () => {
  const a = await getRecommendations(answers, [], null);
  const b = await getRecommendations(answers, [], null);
  expect(a.recommendations.map((r) => r.hobby.id)).toEqual(b.recommendations.map((r) => r.hobby.id));
  expect(a.fallbackReason).toBeNull();
  expect(a.recommendations.every((r) => r.source === 'local')).toBe(true);
});

test('uses a valid AI reply, limited to compatible candidates', async () => {
  let sentIds: string[] = [];
  const result = await getRecommendations(answers, [], async (body) => {
    sentIds = body.candidateIds;
    return {
      suggestions: body.candidateIds.slice(0, 3).map((hobbyId) => ({
        hobbyId,
        reason: 'Because.',
        starterTask: 'Do it',
        steps: ['One'],
      })),
    };
  });
  expect(result.fallbackReason).toBeNull();
  expect(result.recommendations.every((r) => r.source === 'ai')).toBe(true);
  expect(sentIds.length).toBeGreaterThanOrEqual(3);
  expect(sentIds).not.toContain('baking'); // 60 minutes, over budget: filtered before the AI sees it
});

test('falls back to local when the AI fails or invents a hobby', async () => {
  const failed = await getRecommendations(answers, [], async () => {
    throw new Error('offline');
  });
  expect(failed.fallbackReason).toMatch(/matched without it/);
  expect(failed.recommendations).toHaveLength(3);

  const invented = await getRecommendations(answers, [], async () => ({
    suggestions: [
      { hobbyId: 'skydiving', reason: 'x', starterTask: 'x', steps: ['x'] },
      { hobbyId: 'cliff-diving', reason: 'x', starterTask: 'x', steps: ['x'] },
      { hobbyId: 'bungee', reason: 'x', starterTask: 'x', steps: ['x'] },
    ],
  }));
  expect(invented.recommendations.every((r) => r.source === 'local')).toBe(true);
});

test('keeps the good picks from a partly usable AI reply and tops up locally', async () => {
  const result = await getRecommendations(answers, [], async (body) => {
    const [a] = body.candidateIds;
    const pick = { hobbyId: a, reason: 'Because it fits you.', starterTask: 'Do it now', steps: ['One'] };
    // The model repeated one hobby and invented another.
    return { suggestions: [pick, pick, { ...pick, hobbyId: 'skydiving' }] };
  });
  expect(result.fallbackReason).toBeNull();
  expect(result.recommendations).toHaveLength(3);
  expect(new Set(result.recommendations.map((r) => r.hobby.id)).size).toBe(3);
  expect(result.recommendations[0].source).toBe('ai');
  expect(result.recommendations.slice(1).every((r) => r.source === 'local')).toBe(true);
});
