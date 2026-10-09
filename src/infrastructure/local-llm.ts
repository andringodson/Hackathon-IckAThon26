// On-device AI coach: an open-source Qwen3.5 model run by llama.cpp on the phone.
// Free forever, works offline, and quiz answers never leave the device.
import * as FileSystem from 'expo-file-system/legacy';
import type { LlamaContext } from 'llama.rn';
import { AppState } from 'react-native';

import type { InvokeCoach } from '@/application/coach';
import type { AiModel } from '@/domain/types';

import { buildCoachPrompt, coachSchema } from './coach-prompt';

export const MODELS: Record<AiModel, { label: string; detail: string; url: string; bytes: number }> = {
  best: {
    label: 'Qwen3.5 2B',
    detail: 'Best suggestions · 1.3 GB',
    url: 'https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf',
    bytes: 1_281_000_000,
  },
  light: {
    label: 'Qwen3.5 0.8B',
    detail: 'Faster, for older phones · 0.5 GB',
    url: 'https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf',
    bytes: 533_000_000,
  },
};

export const localAiSupported = true;

const dir = `${FileSystem.documentDirectory}models/`;
const pathFor = (m: AiModel) => `${dir}${m}.gguf`;

export async function isDownloaded(m: AiModel): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(pathFor(m));
  // Downloads land in a .part file first, so a complete file at this path is a finished download.
  return info.exists && !info.isDirectory && (info.size ?? 0) > MODELS[m].bytes * 0.95;
}

export function download(m: AiModel, onProgress: (fraction: number) => void) {
  const part = `${pathFor(m)}.part`;
  const task = FileSystem.createDownloadResumable(MODELS[m].url, part, {}, (p) => {
    const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : MODELS[m].bytes;
    onProgress(Math.min(1, p.totalBytesWritten / total));
  });
  const done = (async () => {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const res = await task.downloadAsync();
    if (!res || res.status < 200 || res.status >= 300) throw new Error(`Download failed (${res?.status ?? 'cancelled'})`);
    await FileSystem.moveAsync({ from: part, to: pathFor(m) });
    if (!(await isDownloaded(m))) throw new Error('Download was incomplete');
  })();
  return { done, cancel: () => task.cancelAsync().catch(() => {}) };
}

let loaded: { model: AiModel; ctx: Promise<LlamaContext> } | null = null;

function context(m: AiModel): Promise<LlamaContext> {
  if (loaded?.model !== m) {
    const previous = loaded?.ctx;
    previous?.then((c) => c.release()).catch(() => {});
    // Imported lazily: a phone without a llama.cpp build for its CPU falls back instead of crashing at launch.
    const ctx = import('llama.rn').then((llama) => llama.initLlama({ model: pathFor(m), n_ctx: 2048, use_mlock: false }));
    // A failed load must not be cached, or every later request would fail too.
    ctx.catch(() => {
      if (loaded?.ctx === ctx) loaded = null;
    });
    loaded = { model: m, ctx };
  }
  return loaded.ctx;
}

async function unload() {
  const current = loaded;
  loaded = null;
  await current?.ctx.then((c) => c.release()).catch(() => {});
}

// The model holds ~1 GB of RAM; freeing it in the background keeps Android from killing STILL.
AppState.addEventListener('change', (s) => {
  if (s === 'background') void unload();
});

export async function remove(m: AiModel) {
  if (loaded?.model === m) await unload();
  await FileSystem.deleteAsync(pathFor(m), { idempotent: true });
  await FileSystem.deleteAsync(`${pathFor(m)}.part`, { idempotent: true });
}

/** Warms the model in the background so the first suggestion is not slowed by loading. */
export function preload(m: AiModel) {
  isDownloaded(m)
    .then((ok) => {
      if (ok) context(m).catch(() => {});
    })
    .catch(() => {});
}

// A phone can only run one completion per context, and a stuck one must not freeze "Personalising…" forever.
const GENERATION_TIMEOUT_MS = 90_000;
let queue: Promise<unknown> = Promise.resolve();

export function localCoach(m: AiModel): InvokeCoach {
  return (request, candidates) => {
    const run = async () => {
      const ctx = await context(m);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Reject only once generation has really stopped, so the next queued request starts on a free context.
          ctx.stopCompletion().catch(() => {}).finally(() => reject(new Error('timeout')));
        }, GENERATION_TIMEOUT_MS);
      });
      const generate = ctx
        .completion({
          messages: buildCoachPrompt(request, candidates),
          jinja: true,
          enable_thinking: false,
          reasoning_format: 'none',
          // Grammar-constrained: the model can only emit JSON that fits the schema and the candidate ids.
          response_format: { type: 'json_schema', json_schema: { strict: true, schema: coachSchema(candidates.map((c) => c.id)) } },
          n_predict: 640,
          temperature: 0.6,
          top_p: 0.9,
        })
        .then((result) => JSON.parse(result.content || result.text) as unknown);
      try {
        return await Promise.race([generate, timeout]);
      } finally {
        clearTimeout(timer);
      }
    };
    // Chain behind any earlier request; a failure there must not block this one.
    const next = queue.catch(() => {}).then(run);
    queue = next;
    return next;
  };
}

const BUDDY_SYSTEM = `You are STILL's coach buddy: a warm, upbeat friend helping a young person scroll less and try small hobbies.
Reply in at most three short sentences. Be concrete, suggest one tiny next step, never shame, no medical advice.`;

export type BuddyTurn = { role: 'user' | 'assistant'; content: string };

/** Free-text chat with the on-device model. Shares the one-at-a-time queue with the suggestion coach. */
export function askBuddy(m: AiModel, history: BuddyTurn[]): Promise<string> {
  const run = async () => {
    const ctx = await context(m);
    const result = await ctx.completion({
      messages: [{ role: 'system', content: BUDDY_SYSTEM }, ...history.slice(-8)],
      jinja: true,
      enable_thinking: false,
      reasoning_format: 'none',
      n_predict: 160,
      temperature: 0.7,
      top_p: 0.9,
    });
    return (result.content || result.text || '').trim();
  };
  const next = queue.catch(() => {}).then(run);
  queue = next;
  return next;
}
