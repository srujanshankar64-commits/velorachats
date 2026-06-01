-- Fix 1: Enable realtime on profiles table so online status changes
--         are broadcast live to all connected clients (Instagram/WhatsApp style).
--         Without this, postgres_changes subscriptions on profiles never fire.
alter publication supabase_realtime add table public.profiles;

-- Fix 2: Set replica identity to FULL so the UPDATE payload includes
--         both old and new row values (required for postgres_changes filter matching).
alter table public.profiles replica identity full;

-- Fix 3: Remove stale last_seen_at column reference (column doesn't exist in schema).
--         presence.ts was trying to write last_seen_at which caused silent errors.
--         The column is already called last_seen — no action needed on DB side,
--         just documenting that presence.ts now only writes last_seen.

-- Fix 4: Add an index on is_online to speed up the "Online" tab query.
create index if not exists idx_profiles_is_online on public.profiles (is_online)
  where is_online = true;

-- Fix 5: Add an index on last_seen for "recently active" ordering.
create index if not exists idx_profiles_last_seen on public.profiles (last_seen desc);
