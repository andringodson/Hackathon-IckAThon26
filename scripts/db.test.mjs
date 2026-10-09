// Runs the real migrations in PGlite (Postgres in WASM) and checks the access rules.
// Run: npm run test:db
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { before, test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
let db;

// Minimal stand-in for what Supabase provides: auth.users, auth.uid() and the API roles.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

async function as(user, sql, params) {
  await db.exec(user ? `set role authenticated; set request.jwt.claim.sub = '${user}';` : 'set role anon;');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

const session = (id, user, minutes = 15, date = '2026-10-06') =>
  as(
    user,
    `insert into public.hobby_sessions (id, user_id, hobby_id, started_at, completed_at, local_date, duration_minutes)
     values ($1, $2, 'sketching', '2026-10-06T10:00Z', '2026-10-06T10:20Z', $3, $4)`,
    [id, user, date, minutes],
  );

before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync('supabase/migrations').sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}'), ('${C}');`);
});

test('signing up creates a profile with an invite code', async () => {
  const { rows } = await db.query(`select invite_code from public.profiles where id = $1`, [A]);
  assert.match(rows[0].invite_code, /^[0-9A-F]{8}$/);
});

test('the hobby catalogue is public and matches the app', async () => {
  const { rows } = await as(null, `select count(*)::int as n from public.hobbies`);
  const catalog = readFileSync('src/domain/catalog.ts', 'utf8').match(/^\s+id: '/gm).length;
  assert.equal(rows[0].n, catalog);
});

test('users only ever see their own private rows', async () => {
  await session('10000000-0000-4000-8000-000000000001', A);
  await as(A, `insert into public.scroll_logs (id, user_id, date, estimated_minutes) values (gen_random_uuid(), $1, '2026-10-06', 90)`, [A]);
  await as(A, `insert into public.user_preferences (user_id, baseline_daily_minutes) values ($1, 180)`, [A]);
  for (const table of ['hobby_sessions', 'scroll_logs', 'user_preferences']) {
    const { rows } = await as(B, `select * from public.${table}`);
    assert.equal(rows.length, 0, `${table} leaked to another user`);
    const own = await as(A, `select * from public.${table}`);
    assert.equal(own.rows.length, 1);
  }
  const anon = await as(null, `select * from public.hobby_sessions`);
  assert.equal(anon.rows.length, 0);
});

test('nobody can write, change or delete rows for someone else', async () => {
  await assert.rejects(
    as(B, `insert into public.hobby_sessions (id, user_id, hobby_id, started_at, completed_at, local_date, duration_minutes)
           values (gen_random_uuid(), $1, 'sketching', '2026-10-06T10:00Z', '2026-10-06T10:20Z', '2026-10-06', 10)`, [A]),
  );
  const upd = await as(B, `update public.hobby_sessions set duration_minutes = 1 where user_id = $1 returning id`, [A]);
  assert.equal(upd.rows.length, 0);
  const del = await as(B, `delete from public.scroll_logs where user_id = $1 returning id`, [A]);
  assert.equal(del.rows.length, 0);
});

test('a session cannot claim more minutes than the clock allows', async () => {
  // 20 minutes between start and finish, 90 claimed.
  await assert.rejects(session('10000000-0000-4000-8000-000000000003', C, 90));
  await assert.rejects(session('10000000-0000-4000-8000-000000000004', C, 0));
});

test('friend requests: by code, only the recipient accepts, one per pair', async () => {
  const code = (await db.query(`select invite_code from public.profiles where id = $1`, [B])).rows[0].invite_code;
  assert.equal((await as(A, `select public.send_friend_request($1) as r`, [code.toLowerCase()])).rows[0].r, 'sent');
  assert.equal((await as(A, `select public.send_friend_request('NOPE0000') as r`)).rows[0].r, 'not_found');
  await as(B, `select public.send_friend_request($1)`, [
    (await db.query(`select invite_code from public.profiles where id = $1`, [A])).rows[0].invite_code,
  ]);
  assert.equal((await db.query(`select count(*)::int as n from public.friendships`)).rows[0].n, 1);

  // The recipient can see who asked before accepting; a stranger cannot.
  assert.equal((await as(B, `select id from public.profiles where id = $1`, [A])).rows.length, 1);
  assert.equal((await as(C, `select id from public.profiles where id = $1`, [A])).rows.length, 0);

  const selfAccept = await as(A, `update public.friendships set status = 'accepted' returning id`);
  assert.equal(selfAccept.rows.length, 0);
  const accept = await as(B, `update public.friendships set status = 'accepted' returning id`);
  assert.equal(accept.rows.length, 1);
});

test('leaderboard shows opted-in friends only and never scroll time', async () => {
  await session('10000000-0000-4000-8000-000000000005', B, 10);
  const before = await as(A, `select * from public.weekly_leaderboard('2026-10-05')`);
  assert.deepEqual(before.rows.map((r) => r.user_id), [A]);

  await as(B, `insert into public.user_preferences (user_id, leaderboard_opt_in) values ($1, true)`, [B]);
  const after = await as(A, `select * from public.weekly_leaderboard('2026-10-05')`);
  assert.deepEqual(after.rows.map((r) => [r.user_id, Number(r.minutes)]), [[A, 15], [B, 10]]);
  assert.equal(Object.keys(after.rows[0]).some((k) => k.includes('scroll')), false);

  const stranger = await as(C, `select * from public.weekly_leaderboard('2026-10-05')`);
  assert.deepEqual(stranger.rows.map((r) => r.user_id), [C]);
});

test('challenge progress is computed from sessions, respecting share settings', async () => {
  const id = (
    await as(A, `insert into public.challenges (title, start_date, end_date, created_by) values ('Week of making', '2026-10-05', '2026-10-11', $1) returning id`, [A])
  ).rows[0].id;
  await as(A, `insert into public.challenge_participants (challenge_id, user_id) values ($1, $2)`, [id, A]);
  await as(B, `insert into public.challenge_participants (challenge_id, user_id) values ($1, $2)`, [id, B]);
  await assert.rejects(as(B, `insert into public.challenge_participants (challenge_id, user_id) values ($1, $2)`, [id, C]));

  const hidden = await as(A, `select * from public.challenge_progress($1)`, [id]);
  assert.deepEqual(hidden.rows.map((r) => r.user_id), [A]);
  await as(B, `update public.user_preferences set share_progress = true where user_id = $1`, [B]);
  const shared = await as(A, `select * from public.challenge_progress($1)`, [id]);
  assert.deepEqual(shared.rows.map((r) => [r.user_id, Number(r.minutes)]), [[A, 15], [B, 10]]);
});

test('signed-out callers cannot use the social functions', async () => {
  await assert.rejects(as(null, `select * from public.weekly_leaderboard('2026-10-05')`));
});
