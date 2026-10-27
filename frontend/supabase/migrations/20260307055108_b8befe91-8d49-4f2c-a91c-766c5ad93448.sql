
CREATE OR REPLACE FUNCTION public.get_email_by_name(_name text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.profiles WHERE lower(name) = lower(_name) LIMIT 1
$$;
