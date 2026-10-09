import { HOBBIES } from '@/domain/catalog';
import { parseCoachResponse } from '@/domain/coach-schema';

import { buildCoachPrompt, coachSchema } from '../coach-prompt';

const candidates = HOBBIES.slice(0, 5);
const request = {
  candidateIds: candidates.map((h) => h.id),
  interests: ['making'],
  availableMinutes: 15,
  budget: 'free',
  place: 'either',
  company: 'solo',
  skill: 'beginner',
};

test('the schema only allows candidate ids and exactly three suggestions', () => {
  const s = coachSchema(request.candidateIds) as any;
  const item = s.properties.suggestions.items;
  expect(item.properties.hobbyId.enum).toEqual(request.candidateIds);
  expect(s.properties.suggestions.minItems).toBe(3);
  expect(s.properties.suggestions.maxItems).toBe(3);
  // The grammar limits must stay inside what the validator accepts, or valid model output would be rejected.
  expect(item.properties.reason.maxLength).toBeLessThanOrEqual(280);
  expect(item.properties.starterTask.maxLength).toBeLessThanOrEqual(120);
  expect(item.properties.steps.maxItems).toBeLessThanOrEqual(5);
});

test('output that fits the schema passes the validator', () => {
  const data = {
    suggestions: request.candidateIds.slice(0, 3).map((hobbyId) => ({
      hobbyId,
      reason: 'You like making things and this needs only a pen.',
      starterTask: 'Draw three cups',
      steps: ['Find a pen', 'Draw for five minutes'],
    })),
  };
  expect(parseCoachResponse(data, request.candidateIds)).toHaveLength(3);
});

test('the prompt carries the answers and candidates, and nothing personal', () => {
  const [system, user] = buildCoachPrompt(request, candidates);
  expect(system.role).toBe('system');
  expect(user.content).toContain('Time: 15 minutes');
  for (const h of candidates) expect(user.content).toContain(`${h.id}: ${h.title}`);
  expect(user.content).not.toMatch(/name|email|scroll/i);
});
