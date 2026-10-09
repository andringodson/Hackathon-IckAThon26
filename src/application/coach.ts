import { HOBBIES } from '@/domain/catalog';
import { localRecommendations, rankHobbies, type CoachAnswers } from '@/domain/ranking';
import type { Recommendation } from '@/domain/types';

import { parseCoachResponse, type CoachRequest } from '../../supabase/functions/_shared/coach-schema';

export type InvokeCoach = (body: CoachRequest) => Promise<unknown>;

export interface CoachResult {
  recommendations: Recommendation[];
  /** Set when AI was wanted but the on-device fallback was used instead. */
  fallbackReason: string | null;
}

const byId = new Map(HOBBIES.map((h) => [h.id, h]));

/**
 * Ranking and filtering always happen on-device. When AI is available it only chooses among
 * already-compatible candidates and rewrites the wording, and its reply is validated first.
 */
export async function getRecommendations(
  answers: CoachAnswers,
  exclude: string[],
  invoke: InvokeCoach | null,
): Promise<CoachResult> {
  const local = localRecommendations(HOBBIES, answers, exclude);
  const ranked = rankHobbies(HOBBIES, answers);
  if (!invoke || ranked.length < 3) return { recommendations: local, fallbackReason: null };

  const fresh = ranked.filter((h) => !exclude.includes(h.id));
  const candidates = (fresh.length >= 3 ? fresh : ranked).slice(0, 8);
  try {
    const data = await invoke({
      candidateIds: candidates.map((h) => h.id),
      interests: answers.interests,
      availableMinutes: answers.availableMinutes,
      budget: answers.budget,
      place: answers.place,
      company: answers.company,
      skill: answers.skill,
    });
    const suggestions = parseCoachResponse(data, candidates.map((h) => h.id));
    if (!suggestions) throw new Error('invalid');
    return {
      recommendations: suggestions.map((s) => ({
        hobby: byId.get(s.hobbyId)!,
        reason: s.reason,
        starterTask: s.starterTask,
        steps: s.steps,
        source: 'ai' as const,
      })),
      fallbackReason: null,
    };
  } catch {
    return {
      recommendations: local,
      fallbackReason: "The AI coach couldn't answer just now, so these were matched on your phone.",
    };
  }
}
