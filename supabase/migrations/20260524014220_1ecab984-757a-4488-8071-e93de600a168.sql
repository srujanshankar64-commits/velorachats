
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Allow message senders to update delivery/read/status/is_deleted on their thread
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='members update messages') THEN
    CREATE POLICY "members update messages" ON public.messages
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.chat_rooms r WHERE r.id = messages.room_id AND (r.user_a = auth.uid() OR r.user_b = auth.uid()))
      );
  END IF;
END $$;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;

-- Make sure messages is in the realtime publication
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
