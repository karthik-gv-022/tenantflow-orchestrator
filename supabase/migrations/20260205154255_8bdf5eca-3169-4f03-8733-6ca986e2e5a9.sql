-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Add DELETE policy for tasks (for CRUD)
CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid())
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'tenant_admin')
  OR has_role(auth.uid(), 'system_admin')
);

-- Add DELETE policy for projects
CREATE POLICY "Managers can delete projects"
ON public.projects FOR DELETE
TO authenticated
USING (
  (tenant_id = get_user_tenant(auth.uid()))
  AND (
    has_role(auth.uid(), 'manager')
    OR has_role(auth.uid(), 'tenant_admin')
    OR has_role(auth.uid(), 'system_admin')
  )
);