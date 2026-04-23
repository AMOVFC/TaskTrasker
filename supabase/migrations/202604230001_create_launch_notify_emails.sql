CREATE TABLE public.launch_notify_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT launch_notify_emails_email_key UNIQUE (email)
);

ALTER TABLE public.launch_notify_emails ENABLE ROW LEVEL SECURITY;

-- Anyone can submit their email (no auth required)
CREATE POLICY "allow_public_insert" ON public.launch_notify_emails
  FOR INSERT WITH CHECK (true);

-- Only service role can read submissions
CREATE POLICY "allow_service_role_select" ON public.launch_notify_emails
  FOR SELECT USING (false);
