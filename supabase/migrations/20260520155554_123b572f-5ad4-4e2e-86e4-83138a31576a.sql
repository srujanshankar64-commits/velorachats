
-- Enums
create type public.gender_t as enum ('male','female','other');
create type public.prefer_t as enum ('male','female','any');
create type public.room_type_t as enum ('random','dm');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  gender gender_t not null default 'other',
  prefer_gender prefer_t not null default 'any',
  age int check (age between 13 and 100),
  country text,
  bio text default '',
  avatar_url text,
  interests text[] default '{}',
  is_online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username',
                   split_part(new.email,'@',1)) || substr(replace(new.id::text,'-',''),1,4);
  insert into public.profiles(id, username, gender, prefer_gender, age, country)
  values (
    new.id,
    uname,
    coalesce((new.raw_user_meta_data->>'gender')::gender_t,'other'),
    coalesce((new.raw_user_meta_data->>'prefer_gender')::prefer_t,'any'),
    nullif(new.raw_user_meta_data->>'age','')::int,
    new.raw_user_meta_data->>'country'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Chat rooms
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  type room_type_t not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index on public.chat_rooms (user_a);
create index on public.chat_rooms (user_b);

alter table public.chat_rooms enable row level security;
create policy "members see room" on public.chat_rooms for select
  using (auth.uid() = user_a or auth.uid() = user_b);
create policy "members can end room" on public.chat_rooms for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.messages (room_id, created_at);

alter table public.messages enable row level security;
create policy "members read messages" on public.messages for select
  using (exists (select 1 from public.chat_rooms r where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid())));
create policy "members send messages" on public.messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.chat_rooms r where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid()) and r.ended_at is null
  ));

-- Match queue
create table public.match_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  gender gender_t not null,
  prefer_gender prefer_t not null,
  matched_room_id uuid references public.chat_rooms(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.match_queue enable row level security;
create policy "see own queue + matched" on public.match_queue for select using (auth.uid() = user_id);
create policy "manage own queue" on public.match_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Matchmaking RPC: tries to find a compatible waiting user, creates room, otherwise inserts self.
create or replace function public.find_or_enqueue_match(
  p_gender gender_t,
  p_prefer prefer_t
) returns uuid -- returns room_id if matched, else null
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  partner record;
  new_room uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  -- clean my old queue entry
  delete from public.match_queue where user_id = me;

  -- find someone whose preference matches me and mine matches them
  select q.* into partner
  from public.match_queue q
  where q.user_id <> me
    and q.matched_room_id is null
    and (q.prefer_gender = 'any' or q.prefer_gender::text = p_gender::text)
    and (p_prefer = 'any' or p_prefer::text = q.gender::text)
    and q.created_at > now() - interval '2 minutes'
  order by q.created_at asc
  limit 1
  for update skip locked;

  if found then
    insert into public.chat_rooms(user_a, user_b, type)
    values (partner.user_id, me, 'random')
    returning id into new_room;

    update public.match_queue set matched_room_id = new_room where user_id = partner.user_id;
    return new_room;
  else
    insert into public.match_queue(user_id, gender, prefer_gender)
    values (me, p_gender, p_prefer);
    return null;
  end if;
end;
$$;

-- Get or create a DM room between current user and target
create or replace function public.get_or_create_dm(target uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  rid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = target then raise exception 'cannot dm yourself'; end if;

  select id into rid from public.chat_rooms
  where type = 'dm' and (
    (user_a = me and user_b = target) or (user_a = target and user_b = me)
  )
  limit 1;

  if rid is null then
    insert into public.chat_rooms(user_a, user_b, type) values (me, target, 'dm') returning id into rid;
  end if;
  return rid;
end;
$$;

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.match_queue;
alter publication supabase_realtime add table public.chat_rooms;

alter table public.messages replica identity full;
alter table public.match_queue replica identity full;
alter table public.chat_rooms replica identity full;
