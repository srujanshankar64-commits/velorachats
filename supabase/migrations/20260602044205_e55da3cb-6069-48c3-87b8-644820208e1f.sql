
-- 1. Friendships: only addressee can update status (split policies)
DROP POLICY IF EXISTS "members update friendships" ON public.friendships;

CREATE POLICY "addressee updates friendship status"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

-- 2. room_reads: restrict to authenticated role (was public/anon)
DROP POLICY IF EXISTS "users see own reads" ON public.room_reads;
DROP POLICY IF EXISTS "users update own reads" ON public.room_reads;
DROP POLICY IF EXISTS "users upsert own reads" ON public.room_reads;

CREATE POLICY "users see own reads"
ON public.room_reads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users update own reads"
ON public.room_reads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users upsert own reads"
ON public.room_reads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. profiles: hide is_blocked column from clients (column-level revoke)
REVOKE SELECT (is_blocked) ON public.profiles FROM anon, authenticated;
