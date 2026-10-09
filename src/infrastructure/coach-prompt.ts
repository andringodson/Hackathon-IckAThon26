import type { CoachRequest } from '@/domain/coach-schema';
import type { Hobby } from '@/domain/types';

const SYSTEM = `You are STILL's hobby coach for students and young adults who want to scroll less.
Choose exactly three different hobbies from the candidates, using only their ids.
For each, write:
- reason: one warm, specific sentence saying why it suits this person, mentioning what they told you.
- starterTask: a concrete first task that fits in their available minutes.
- steps: two or three short, practical steps.
Plain, friendly English. Never shame the user. No medical advice.`;

/** Small models do best with a short system prompt and compact facts, so only what matters is sent. */
export function buildCoachPrompt(r: CoachRequest, candidates: Hobby[]) {
  const person = [
    `Enjoys: ${r.interests.length ? r.interests.join(', ') : 'not sure yet'}`,
    `Time: ${r.availableMinutes} minutes`,
    `Budget: ${r.budget}`,
    `Place: ${r.place}`,
    `Company: ${r.company}`,
    `Experience: ${r.skill}`,
  ].join('\n');
  const list = candidates.map((h) => `- ${h.id}: ${h.title}. ${h.description} (${h.costNote})`).join('\n');
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `About me:\n${person}\n\nCandidates:\n${list}` },
  ];
}

/** JSON schema the sampler is constrained to; hobbyId can only be one of the candidates. */
export function coachSchema(ids: string[]) {
  return {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            hobbyId: { type: 'string', enum: ids },
            reason: { type: 'string', minLength: 20, maxLength: 220 },
            starterTask: { type: 'string', minLength: 8, maxLength: 100 },
            steps: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string', minLength: 4, maxLength: 100 } },
          },
          required: ['hobbyId', 'reason', 'starterTask', 'steps'],
          additionalProperties: false,
        },
      },
    },
    required: ['suggestions'],
    additionalProperties: false,
  };
}
