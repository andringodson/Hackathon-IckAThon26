// AI Hobby Coach. The app ranks hobbies on-device; this function only asks Gemini to pick three
// of those candidates and write the reason and starter task. The key never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { parseCoachRequest, parseCoachResponse } from '../_shared/coach-schema.ts';

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
const REQUESTS_PER_HOUR = Number(Deno.env.get('COACH_REQUESTS_PER_HOUR') ?? 20);
const MAX_BODY = 4096;
const TIMEOUT_MS = 12_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestions: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          hobbyId: { type: 'STRING' },
          reason: { type: 'STRING' },
          starterTask: { type: 'STRING' },
          steps: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 1, maxItems: 4 },
        },
        required: ['hobbyId', 'reason', 'starterTask', 'steps'],
      },
    },
  },
  required: ['suggestions'],
};

const SYSTEM = `You are STILL's hobby coach for students and young adults who want to scroll less.
Pick exactly three different hobbies from the candidate list. Use only the given ids.
For each: one warm, specific sentence on why it fits this person (max 200 characters),
a concrete starter task that fits in their available minutes, and 2 to 4 short steps.
Never shame the user. Never give medical advice. Plain, natural English.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!GEMINI_KEY) return json({ error: 'not_configured' }, 503);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const input = parseCoachRequest(body);
  if (!input) return json({ error: 'bad_request' }, 400);

  // Runs as the caller, so row-level security applies to every query below.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  // shortcut: count-then-insert can let a burst slip a request or two over the limit; move to an RPC with a lock if abuse shows up.
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase.from('ai_requests').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if ((count ?? 0) >= REQUESTS_PER_HOUR) return json({ error: 'rate_limited' }, 429);
  await supabase.from('ai_requests').insert({ user_id: user.id });

  const { data: hobbies, error } = await supabase
    .from('hobbies')
    .select('id, title, description, cost_note, estimated_duration, materials')
    .in('id', input.candidateIds);
  if (error || !hobbies || hobbies.length < 3) return json({ error: 'bad_candidates' }, 400);

  // Only the answers needed for a suggestion are sent; no name, account or screen-time data.
  const prompt = JSON.stringify({
    person: {
      interests: input.interests,
      availableMinutes: input.availableMinutes,
      budget: input.budget,
      place: input.place,
      company: input.company,
      skill: input.skill,
    },
    candidates: hobbies,
  });

  let text: string | undefined;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });
    if (!res.ok) {
      console.error('gemini_status', res.status);
      return json({ error: 'ai_unavailable' }, 502);
    }
    const data = await res.json();
    text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  } catch (e) {
    console.error('gemini_failed', e instanceof Error ? e.name : 'unknown');
    return json({ error: 'ai_unavailable' }, 504);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text ?? '');
  } catch {
    return json({ error: 'ai_malformed' }, 502);
  }
  const suggestions = parseCoachResponse(parsed, hobbies.map((h) => h.id));
  if (!suggestions) return json({ error: 'ai_malformed' }, 502);

  await supabase
    .from('recommendations')
    .insert(suggestions.map((s) => ({ user_id: user.id, hobby_id: s.hobbyId, explanation: s.reason, source: 'ai' })));

  return json({ suggestions });
});
