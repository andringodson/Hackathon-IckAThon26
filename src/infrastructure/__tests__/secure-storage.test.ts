import { chunkedStorage, type KeyValue } from '../secure-storage';

function memory(): KeyValue & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItemAsync: async (k) => map.get(k) ?? null,
    setItemAsync: async (k, v) => void map.set(k, v),
    deleteItemAsync: async (k) => void map.delete(k),
  };
}

test('round-trips a value larger than one chunk', async () => {
  const mem = memory();
  const s = chunkedStorage(mem);
  const big = JSON.stringify({ token: 'x'.repeat(5000), user: 'ü' });
  await s.setItem('sb-auth-token', big);
  expect(await s.getItem('sb-auth-token')).toBe(big);
  expect(mem.map.get('sb-auth-token.n')).toBe('3');
});

test('a shorter value removes the old extra chunks', async () => {
  const mem = memory();
  const s = chunkedStorage(mem);
  await s.setItem('k', 'x'.repeat(4000));
  await s.setItem('k', 'short');
  expect(await s.getItem('k')).toBe('short');
  expect([...mem.map.keys()].sort()).toEqual(['k.0', 'k.n']);
});

test('missing chunk reads as null, not corrupt data', async () => {
  const mem = memory();
  const s = chunkedStorage(mem);
  await s.setItem('k', 'x'.repeat(4000));
  mem.map.delete('k.1');
  expect(await s.getItem('k')).toBeNull();
});

test('keys with characters SecureStore rejects are sanitised', async () => {
  const mem = memory();
  const s = chunkedStorage(mem);
  await s.setItem('sb:project/auth', 'v');
  expect(await s.getItem('sb:project/auth')).toBe('v');
  expect(mem.map.has('sb_project_auth.0')).toBe(true);
  await s.removeItem('sb:project/auth');
  expect(mem.map.size).toBe(0);
});
