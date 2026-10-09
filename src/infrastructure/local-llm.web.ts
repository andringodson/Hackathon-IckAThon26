// The browser build has no llama.cpp runtime; the app uses on-device ranking there.
import type { InvokeCoach } from '@/application/coach';
import type { AiModel } from '@/domain/types';

export const MODELS: Record<AiModel, { label: string; detail: string; url: string; bytes: number }> = {
  best: { label: 'Qwen3.5 2B', detail: 'Best suggestions · 1.3 GB', url: '', bytes: 0 },
  light: { label: 'Qwen3.5 0.8B', detail: 'Faster, for older phones · 0.5 GB', url: '', bytes: 0 },
};
export const localAiSupported = false;
export const isDownloaded = async (_m: AiModel) => false;
export const download = (_m: AiModel, _p: (f: number) => void) => ({
  done: Promise.reject(new Error('Not available on the web')),
  cancel: () => {},
});
export const remove = async (_m: AiModel) => {};
export const preload = (_m: AiModel) => {};
export const localCoach = (_m: AiModel): InvokeCoach => async () => {
  throw new Error('Not available on the web');
};
