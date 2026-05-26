create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  addressee_id uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  is_temporary boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
alter table public.friendships enable row level security;
create policy "members see friendships" on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "users send friend requests" on public.friendships for insert with check (auth.uid() = requester_id);
create policy "members update friendships" on public.friendships for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "members delete friendships" on public.friendships for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);
create index idx_friendships_addressee on public.friendships(addressee_id);
create index idx_friendships_requester on public.friendships(requester_id);

create table public.room_reads (
  user_id uuid not null,
  room_id uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, room_id)
);
alter table public.room_reads enable row level security;
create policy "users see own reads" on public.room_reads for select using (auth.uid() = user_id);
create policy "users upsert own reads" on public.room_reads for insert with check (auth.uid() = user_id);
create policy "users update own reads" on public.room_reads for update using (auth.uid() = user_id);

alter publication supabase_realtime add table public.friendships;