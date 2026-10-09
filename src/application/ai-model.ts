import { useSyncExternalStore } from 'react';

import type { AiModel } from '@/domain/types';
import { download, isDownloaded, remove } from '@/infrastructure/local-llm';

interface AiState {
  ready: Record<AiModel, boolean>;
  downloading: AiModel | null;
  progress: number;
  error: string | null;
}

// Module-level so a download keeps running and reporting when the user switches screens.
let state: AiState = { ready: { best: false, light: false }, downloading: null, progress: 0, error: null };
let cancel: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<AiState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAiModels(): AiState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function refreshModels() {
  const [best, light] = await Promise.all([isDownloaded('best'), isDownloaded('light')]);
  set({ ready: { best, light } });
}

export async function startDownload(m: AiModel) {
  if (state.downloading) return;
  set({ downloading: m, progress: 0, error: null });
  const task = download(m, (progress) => set({ progress }));
  cancel = task.cancel;
  try {
    await task.done;
    set({ ready: { ...state.ready, [m]: true }, downloading: null, progress: 1 });
  } catch (e) {
    const cancelled = !cancel;
    set({ downloading: null, error: cancelled ? null : e instanceof Error ? e.message : 'Download failed' });
  } finally {
    cancel = null;
  }
}

export function cancelDownload() {
  const c = cancel;
  cancel = null;
  c?.();
}

export async function deleteModel(m: AiModel) {
  await remove(m);
  set({ ready: { ...state.ready, [m]: false } });
}
