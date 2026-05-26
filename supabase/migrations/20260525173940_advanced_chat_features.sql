-- Recreate handle_new_user without catching exceptions silently
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
  return new;
end;
$function$;

-- Add is_read column to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_messages_unread_perf ON public.messages(room_id, is_read, read_at, created_at);

-- Create cleanup_old_messages function (deletes messages older than 30 minutes that are read and not in top 10)
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  r_id uuid;
begin
  -- Loop through each active room
  for r_id in select distinct room_id from public.messages loop
    delete from public.messages
    where room_id = r_id
      and is_read = true
      and read_at < now() - interval '30 minutes'
      and id not in (
        select m.id
        from public.messages m
        where m.room_id = r_id
        order by m.created_at desc
        limit 10
      );
  end loop;
end;
$$;
