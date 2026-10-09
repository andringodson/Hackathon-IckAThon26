// Shared by the Edge Function (Deno) and the app (Metro). Keep it dependency-free.

export interface CoachSuggestion {
  hobbyId: string;
  reason: string;
  starterTask: string;
  steps: string[];
}

export interface CoachRequest {
  candidateIds: string[];
  interests: string[];
  availableMinutes: number;
  budget: string;
  place: string;
  company: string;
  skill: string;
}

const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

const ENUMS = {
  budget: ['free', 'low', 'flexible'],
  place: ['indoor', 'outdoor', 'either'],
  company: ['solo', 'social', 'either'],
  skill: ['beginner', 'experienced'],
};

export function parseCoachRequest(body: unknown): CoachRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const ids = b.candidateIds;
  const interests = b.interests;
  if (!Array.isArray(ids) || ids.length < 3 || ids.length > 8 || !ids.every((id) => isText(id, 40))) return null;
  if (!Array.isArray(interests) || interests.length > 8 || !interests.every((i) => isText(i, 20))) return null;
  if (typeof b.availableMinutes !== 'number' || ![5, 10, 15, 30, 60].includes(b.availableMinutes)) return null;
  for (const [key, allowed] of Object.entries(ENUMS)) {
    if (!allowed.includes(b[key] as string)) return null;
  }
  return {
    candidateIds: [...new Set(ids as string[])],
    interests: interests as string[],
    availableMinutes: b.availableMinutes,
    budget: b.budget as string,
    place: b.place as string,
    company: b.company as string,
    skill: b.skill as string,
  };
}

/** Accepts exactly three distinct suggestions drawn from the allowed hobby ids. */
export function parseCoachResponse(data: unknown, allowedIds: string[]): CoachSuggestion[] | null {
  const list = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list) || list.length !== 3) return null;
  const seen = new Set<string>();
  const out: CoachSuggestion[] = [];
  for (const item of list) {
    const s = item as Record<string, unknown>;
    if (!isText(s.hobbyId, 40) || !allowedIds.includes(s.hobbyId) || seen.has(s.hobbyId)) return null;
    if (!isText(s.reason, 280) || !isText(s.starterTask, 120)) return null;
    if (!Array.isArray(s.steps) || s.steps.length < 1 || s.steps.length > 5) return null;
    if (!s.steps.every((step) => isText(step, 120))) return null;
    seen.add(s.hobbyId);
    out.push({
      hobbyId: s.hobbyId,
      reason: s.reason.trim(),
      starterTask: s.starterTask.trim(),
      steps: (s.steps as string[]).map((step) => step.trim()),
    });
  }
  return out;
}
