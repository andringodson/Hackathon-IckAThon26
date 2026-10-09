// SecureStore rejects or warns on values over ~2 KB, and Supabase sessions can be larger,
// so long values are split across numbered keys.

export interface KeyValue {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const CHUNK = 1800;
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export function chunkedStorage(store: KeyValue) {
  async function removeItem(key: string) {
    const k = safe(key);
    const count = Number(await store.getItemAsync(`${k}.n`)) || 0;
    await Promise.all([...Array(count)].map((_, i) => store.deleteItemAsync(`${k}.${i}`)));
    await store.deleteItemAsync(`${k}.n`);
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const k = safe(key);
      const count = Number(await store.getItemAsync(`${k}.n`));
      if (!count) return null;
      const parts = await Promise.all([...Array(count)].map((_, i) => store.getItemAsync(`${k}.${i}`)));
      // A missing chunk means a torn write: treat as signed out rather than return corrupt JSON.
      return parts.every((p) => p !== null) ? parts.join('') : null;
    },
    async setItem(key: string, value: string) {
      await removeItem(key);
      const k = safe(key);
      const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
      await Promise.all(parts.map((p, i) => store.setItemAsync(`${k}.${i}`, p)));
      await store.setItemAsync(`${k}.n`, String(parts.length));
    },
    removeItem,
  };
}
