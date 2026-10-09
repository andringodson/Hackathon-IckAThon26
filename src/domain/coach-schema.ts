// Validates what the AI coach returns before anything reaches the screen.

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

function parseOne(item: unknown, allowedIds: string[]): CoachSuggestion | null {
  const s = (item ?? {}) as Record<string, unknown>;
  if (!isText(s.hobbyId, 40) || !allowedIds.includes(s.hobbyId)) return null;
  if (!isText(s.reason, 280) || !isText(s.starterTask, 120)) return null;
  if (!Array.isArray(s.steps) || s.steps.length < 1 || s.steps.length > 5) return null;
  if (!s.steps.every((step) => isText(step, 120))) return null;
  return {
    hobbyId: s.hobbyId,
    reason: s.reason.trim(),
    starterTask: s.starterTask.trim(),
    steps: (s.steps as string[]).map((step) => step.trim()),
  };
}

/** Every valid, distinct suggestion in the reply, in order. Used when the reply is only partly usable. */
export function salvageCoachResponse(data: unknown, allowedIds: string[]): CoachSuggestion[] {
  const list = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: CoachSuggestion[] = [];
  for (const item of list) {
    const parsed = parseOne(item, allowedIds);
    if (parsed && !seen.has(parsed.hobbyId)) {
      seen.add(parsed.hobbyId);
      out.push(parsed);
    }
  }
  return out.slice(0, 3);
}

/** Accepts exactly three distinct suggestions drawn from the allowed hobby ids. */
export function parseCoachResponse(data: unknown, allowedIds: string[]): CoachSuggestion[] | null {
  const list = (data as { suggestions?: unknown } | null)?.suggestions;
  if (!Array.isArray(list) || list.length !== 3) return null;
  const out = salvageCoachResponse(data, allowedIds);
  return out.length === 3 ? out : null;
}
