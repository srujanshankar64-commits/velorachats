-- Ephemeral image messages: auto-delete when receiver reads them

-- 1. Increase message content limit to fit base64 images (max ~1.5MB = ~2MB base64)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_content_check
  CHECK (char_length(content) BETWEEN 1 AND 2100000);

-- 2. Add image_type column to distinguish image messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_image BOOLEAN NOT NULL DEFAULT false;

-- 3. Trigger: auto-delete image messages as soon as read_at is set
CREATE OR REPLACE FUNCTION public.delete_image_on_read()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this is an image message and read_at just got set
  IF NEW.is_image = true AND NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL) THEN
    DELETE FROM public.messages WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_image_on_read ON public.messages;
CREATE TRIGGER trg_delete_image_on_read
  AFTER UPDATE OF read_at ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_image_on_read();

-- 4. Index for image message queries
CREATE INDEX IF NOT EXISTS idx_messages_is_image ON public.messages(is_image) WHERE is_image = true;
