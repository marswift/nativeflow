-- View for admin email lookups (service role access only)
CREATE OR REPLACE VIEW public.auth_user_emails AS
SELECT id, email FROM auth.users;

-- RPC function for email-based user search
CREATE OR REPLACE FUNCTION public.get_user_ids_by_email(email_pattern text)
RETURNS TABLE(id uuid) AS $$
  SELECT id FROM auth.users WHERE email ILIKE email_pattern;
$$ LANGUAGE sql SECURITY DEFINER;
