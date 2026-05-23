
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uname text;
  base text;
begin
  base := coalesce(
    new.raw_user_meta_data->>'username',
    nullif(split_part(coalesce(new.email,''),'@',1), ''),
    'guest'
  );
  uname := base || substr(replace(new.id::text,'-',''),1,6);

  begin
    insert into public.profiles(id, username, gender, prefer_gender, age, country, name, city, state)
    values (
      new.id, uname,
      coalesce(nullif(new.raw_user_meta_data->>'gender','')::gender_t,'other'),
      coalesce(nullif(new.raw_user_meta_data->>'prefer_gender','')::prefer_t,'any'),
      nullif(new.raw_user_meta_data->>'age','')::int,
      new.raw_user_meta_data->>'country',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'city',
      new.raw_user_meta_data->>'state'
    );
  exception when others then null;
  end;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL CHECK (room_id IN ('dating','friendship','open')),
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_created ON public.room_messages(room_id, created_at DESC);
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "room msgs readable by authed" ON public.room_messages;
CREATE POLICY "room msgs readable by authed" ON public.room_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users post own room msgs" ON public.room_messages;
CREATE POLICY "users post own room msgs" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users delete own room msgs" ON public.room_messages;
CREATE POLICY "users delete own room msgs" ON public.room_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blocked_users (
  blocker_id uuid NOT NULL, blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id), CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see own blocks" ON public.blocked_users;
CREATE POLICY "users see own blocks" ON public.blocked_users FOR SELECT TO authenticated USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
DROP POLICY IF EXISTS "users create own blocks" ON public.blocked_users;
CREATE POLICY "users create own blocks" ON public.blocked_users FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "users remove own blocks" ON public.blocked_users;
CREATE POLICY "users remove own blocks" ON public.blocked_users FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL, reported_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  details text CHECK (length(details) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users create reports" ON public.reports;
CREATE POLICY "users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "users see own reports" ON public.reports;
CREATE POLICY "users see own reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone submits contact" ON public.contact_submissions;
CREATE POLICY "anyone submits contact" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "users see own submissions" ON public.contact_submissions;
CREATE POLICY "users see own submissions" ON public.contact_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
