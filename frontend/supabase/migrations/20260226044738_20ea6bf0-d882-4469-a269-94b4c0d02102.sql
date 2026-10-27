
-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Create user_roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience: is current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS for user_roles: only admins can manage
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- System configuration table (key-value style)
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read config" ON public.system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert config" ON public.system_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update config" ON public.system_config FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete config" ON public.system_config FOR DELETE TO authenticated USING (public.is_admin());

-- Temperature history
CREATE TABLE public.temperature_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.temperature_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read temp history" ON public.temperature_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert temp history" ON public.temperature_history FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Humidity history
CREATE TABLE public.humidity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.humidity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read humidity history" ON public.humidity_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert humidity history" ON public.humidity_history FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- Enable realtime for history tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.temperature_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.humidity_history;

-- Insert default system config
INSERT INTO public.system_config (key, value) VALUES
  ('temp_threshold', '35'),
  ('gas_threshold', '"HIGH"'),
  ('parking_capacity', '2'),
  ('alert_sound', 'true'),
  ('manual_override', 'false');
