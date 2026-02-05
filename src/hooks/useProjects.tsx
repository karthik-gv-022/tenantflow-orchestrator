import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useProjects() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!profile?.tenant_id
  });

  const createProject = useMutation({
    mutationFn: async (project: { name: string; description?: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...project,
          tenant_id: profile.tenant_id,
          created_by: user.id
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {
    projects,
    isLoading,
    createProject,
    updateProject,
    deleteProject
  };
}
