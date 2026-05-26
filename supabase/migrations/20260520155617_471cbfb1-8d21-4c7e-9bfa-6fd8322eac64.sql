
revoke execute on function public.find_or_enqueue_match(gender_t, prefer_t) from public, anon;
revoke execute on function public.get_or_create_dm(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.find_or_enqueue_match(gender_t, prefer_t) to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
