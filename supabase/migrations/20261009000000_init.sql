-- STILL schema. Every table holding personal data has row-level security on, and policies
-- use (select auth.uid()) so Postgres evaluates it once per query instead of once per row.

create extension if not exists pgcrypto;

-- Profiles ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  privacy_mode boolean not null default false,
  -- Short code a friend types to send a request. Avoids looking people up by email.
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Preferences ------------------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  interests text[] not null default '{}' check (cardinality(interests) <= 8),
  available_minutes smallint not null default 15 check (available_minutes in (5, 10, 15, 30, 60)),
  budget text not null default 'free' check (budget in ('free', 'low', 'flexible')),
  activity_place text not null default 'either' check (activity_place in ('indoor', 'outdoor', 'either')),
  activity_company text not null default 'either' check (activity_company in ('solo', 'social', 'either')),
  skill_level text not null default 'beginner' check (skill_level in ('beginner', 'experienced')),
  materials text[] not null default '{}' check (cardinality(materials) <= 16),
  reminder_times text[] not null default '{}' check (cardinality(reminder_times) <= 4),
  reminders_on boolean not null default false,
  baseline_daily_minutes smallint check (baseline_daily_minutes between 0 and 1440),
  daily_goal_minutes smallint not null default 15 check (daily_goal_minutes between 5 and 240),
  share_progress boolean not null default false,
  leaderboard_opt_in boolean not null default false,
  ai_consent boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger preferences_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- Hobbies (public catalogue) ---------------------------------------------------------

create table public.hobbies (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  title text not null,
  category text not null,
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'steady', 'stretch')),
  estimated_cost text not null check (estimated_cost in ('free', 'low', 'flexible')),
  cost_note text not null,
  estimated_duration smallint not null check (estimated_duration between 1 and 240),
  activity_place text not null,
  activity_company text not null,
  for_skill text not null,
  materials text[] not null default '{}',
  starter_title text not null,
  starter_steps text[] not null,
  is_active boolean not null default true
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  explanation text not null check (char_length(explanation) <= 280),
  source text not null check (source in ('local', 'ai')),
  created_at timestamptz not null default now()
);
create index recommendations_user_idx on public.recommendations (user_id, created_at desc);

create table public.saved_hobbies (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  created_at timestamptz not null default now(),
  primary key (user_id, hobby_id)
);

-- Activity ---------------------------------------------------------------------------

create table public.scroll_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  estimated_minutes smallint not null check (estimated_minutes between 0 and 1440),
  source text not null default 'manual' check (source in ('manual')),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index scroll_logs_user_date_idx on public.scroll_logs (user_id, date desc);

create table public.hobby_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  -- The user's calendar day, sent by the device, because "today" depends on their time zone.
  local_date date not null,
  duration_minutes smallint not null check (duration_minutes between 1 and 180),
  status text not null default 'completed' check (status in ('completed')),
  reflection text not null default '' check (char_length(reflection) <= 500),
  created_at timestamptz not null default now(),
  check (completed_at >= started_at),
  -- Duration cannot exceed the wall-clock time between start and finish.
  check (duration_minutes <= ceil(extract(epoch from (completed_at - started_at)) / 60) + 1)
);
create index hobby_sessions_user_date_idx on public.hobby_sessions (user_id, local_date desc);

-- Daily goal history: preferences hold the current goal; this keeps what it was on each day.
create table public.daily_goals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  target_minutes smallint not null check (target_minutes between 5 and 240),
  primary key (user_id, date)
);

-- Social -----------------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
-- One friendship per pair, whichever side asked first.
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_recipient_idx on public.friendships (recipient_id);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  start_date date not null,
  end_date date not null,
  -- e.g. {"target_minutes": 60} or {"target_sessions": 5}
  rules jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  check (end_date >= start_date and end_date - start_date <= 31)
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_participants_user_idx on public.challenge_participants (user_id);

-- AI rate limiting: one row per coach request, readable only by its owner.
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_requests_user_time_idx on public.ai_requests (user_id, created_at desc);

-- Helpers ----------------------------------------------------------------------------

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(a, b)
      and greatest(f.requester_id, f.recipient_id) = greatest(a, b)
  );
$$;

-- Any friendship row, pending included, so a recipient can see who sent a request.
create or replace function public.are_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where least(f.requester_id, f.recipient_id) = least(a, b)
      and greatest(f.requester_id, f.recipient_id) = greatest(a, b)
  );
$$;

-- Row-level security -----------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.hobbies enable row level security;
alter table public.recommendations enable row level security;
alter table public.saved_hobbies enable row level security;
alter table public.scroll_logs enable row level security;
alter table public.hobby_sessions enable row level security;
alter table public.daily_goals enable row level security;
alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.ai_requests enable row level security;

-- Connected people can read each other's profile row (name, time zone, invite code).
-- Activity, scroll time and preferences live in owner-only tables and stay private.
create policy "profiles: read own or connected" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.are_connected(id, (select auth.uid())));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "hobbies: readable" on public.hobbies for select to anon, authenticated using (is_active);

-- Private tables: owner only, for every operation.
create policy "preferences: own" on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recommendations: own" on public.recommendations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved: own" on public.saved_hobbies for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "scroll_logs: own" on public.scroll_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions: own" on public.hobby_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "daily_goals: own" on public.daily_goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "ai_requests: read own" on public.ai_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "ai_requests: insert own" on public.ai_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Friend requests go through send_friend_request(); members can read, accept (recipient) or remove.
create policy "friendships: read own" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));
create policy "friendships: recipient accepts" on public.friendships for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (recipient_id = (select auth.uid()) and status = 'accepted');
create policy "friendships: either side removes" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));

create policy "challenges: readable" on public.challenges for select to authenticated using (true);
create policy "challenges: create own" on public.challenges for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "participants: read own or friend" on public.challenge_participants for select to authenticated
  using (user_id = (select auth.uid()) or public.are_friends(user_id, (select auth.uid())));
create policy "participants: join as self" on public.challenge_participants for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "participants: leave as self" on public.challenge_participants for delete to authenticated
  using (user_id = (select auth.uid()));

-- Social functions -------------------------------------------------------------------

create or replace function public.send_friend_request(code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select id into them from public.profiles where invite_code = upper(trim(code));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;
  insert into public.friendships (requester_id, recipient_id) values (me, them)
  on conflict do nothing;
  return 'sent';
end;
$$;

-- Weekly hobby minutes for me and accepted friends who opted in. Progress is computed here
-- from stored sessions, never accepted from the client. Scroll time is never exposed.
create or replace function public.weekly_leaderboard(week_start date) returns table (
  user_id uuid, display_name text, minutes bigint, is_me boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, coalesce(sum(s.duration_minutes), 0), p.id = auth.uid()
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  left join public.hobby_sessions s
    on s.user_id = p.id and s.local_date between week_start and week_start + 6
  where auth.uid() is not null
    and (p.id = auth.uid() or (coalesce(up.leaderboard_opt_in, false) and public.are_friends(p.id, auth.uid())))
  group by p.id, p.display_name
  order by 3 desc;
$$;

create or replace function public.challenge_progress(target uuid) returns table (
  user_id uuid, display_name text, minutes bigint, sessions bigint, is_me boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, coalesce(sum(s.duration_minutes), 0), count(s.id), p.id = auth.uid()
  from public.challenge_participants cp
  join public.challenges c on c.id = cp.challenge_id
  join public.profiles p on p.id = cp.user_id
  left join public.user_preferences up on up.user_id = p.id
  left join public.hobby_sessions s
    on s.user_id = p.id and s.local_date between c.start_date and c.end_date
  where cp.challenge_id = target
    and auth.uid() is not null
    and (p.id = auth.uid() or (coalesce(up.share_progress, false) and public.are_friends(p.id, auth.uid())))
  group by p.id, p.display_name
  order by 3 desc;
$$;

revoke execute on function public.send_friend_request(text) from anon, public;
revoke execute on function public.weekly_leaderboard(date) from anon, public;
revoke execute on function public.challenge_progress(uuid) from anon, public;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.weekly_leaderboard(date) to authenticated;
grant execute on function public.challenge_progress(uuid) to authenticated;
