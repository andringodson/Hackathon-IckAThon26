import { HOBBIES } from '@/domain/catalog';
import { localRecommendations, rankHobbies, type CoachAnswers } from '@/domain/ranking';
import type { Hobby, Recommendation } from '@/domain/types';

import { parseCoachResponse, salvageCoachResponse, type CoachRequest } from '@/domain/coach-schema';

export type InvokeCoach = (body: CoachRequest, candidates: Hobby[]) => Promise<unknown>;

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
    }, candidates);
    const ids = candidates.map((h) => h.id);
    const suggestions = parseCoachResponse(data, ids) ?? salvageCoachResponse(data, ids);
    if (!suggestions.length) throw new Error('invalid');
    const ai: Recommendation[] = suggestions.map((s) => ({
      hobby: byId.get(s.hobbyId)!,
      reason: s.reason,
      starterTask: s.starterTask,
      steps: s.steps,
      source: 'ai' as const,
    }));
    // A partly usable reply (say, a repeated hobby) keeps its good picks and tops up from the local ranking.
    const topUp = local.filter((r) => !ai.some((a) => a.hobby.id === r.hobby.id));
    return { recommendations: [...ai, ...topUp].slice(0, 3), fallbackReason: null };
  } catch {
    return {
      recommendations: local,
      fallbackReason: "The AI coach couldn't finish this time, so these were matched without it.",
    };
  }
}
