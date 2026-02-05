-- Create role enum
CREATE TYPE public.app_role AS ENUM ('system_admin', 'tenant_admin', 'manager', 'team_lead', 'team_member');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('created', 'in_progress', 'review', 'completed');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'team_member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, role)
);

-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'created' NOT NULL,
    priority task_priority DEFAULT 'medium' NOT NULL,
    assignee_id UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    sla_hours INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  OR public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'tenant_admin')
);

CREATE POLICY "System admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'));

-- Tenants policies
CREATE POLICY "Users can view their tenant"
ON public.tenants FOR SELECT
TO authenticated
USING (
  id = public.get_user_tenant(auth.uid())
  OR public.has_role(auth.uid(), 'system_admin')
);

-- Projects policies
CREATE POLICY "Users can view projects in their tenant"
ON public.projects FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  OR public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Managers can create projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
  AND (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'system_admin')
  )
);

CREATE POLICY "Managers can update projects in their tenant"
ON public.projects FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'tenant_admin')
    OR public.has_role(auth.uid(), 'system_admin')
  )
);

-- Tasks policies
CREATE POLICY "Users can view tasks in their tenant"
ON public.tasks FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  OR public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "Users can create tasks in their tenant"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own tasks or assigned tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  AND (
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'team_lead')
    OR public.has_role(auth.uid(), 'tenant_admin')
  )
);

-- Audit logs policies
CREATE POLICY "Users can view audit logs in their tenant"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant(auth.uid())
  OR public.has_role(auth.uid(), 'system_admin')
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get or create default tenant
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
  
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug) VALUES ('Default Organization', 'default')
    RETURNING id INTO default_tenant_id;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
  VALUES (
    NEW.id,
    default_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'team_member');

  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();