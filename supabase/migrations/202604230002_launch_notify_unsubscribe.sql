ALTER TABLE public.launch_notify_emails
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
