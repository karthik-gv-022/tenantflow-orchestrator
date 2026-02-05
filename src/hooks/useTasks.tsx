import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useTasks() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assignee_id_fkey(*), project:projects(*)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Task[];
    },
    enabled: !!profile?.tenant_id
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      title: string;
      description?: string;
      priority: TaskPriority;
      due_date?: string | null;
      tenant_id: string;
      created_by: string;
      project_id?: string | null;
      assignee_id?: string | null;
      sla_hours?: number | null;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          status: 'created' as TaskStatus
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Handle status transitions
      if (updates.status === 'in_progress' && !updates.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (updates.status === 'completed' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const myTasks = tasks.filter(t => t.assignee_id === user?.id);
  
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < new Date();
  });

  const tasksByStatus = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const tasksByPriority = tasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<TaskPriority, number>);

  return {
    tasks,
    myTasks,
    overdueTasks,
    tasksByStatus,
    tasksByPriority,
    isLoading,
    createTask,
    updateTask,
    deleteTask
  };
}
