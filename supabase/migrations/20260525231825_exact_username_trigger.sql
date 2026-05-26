CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uname text;
begin
  uname := new.raw_user_meta_data->>'username';
  if uname is null then
    uname := coalesce(
      nullif(split_part(coalesce(new.email,''),'@',1), ''),
      'guest'
    ) || substr(replace(new.id::text,'-',''),1,6);
  end if;

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
