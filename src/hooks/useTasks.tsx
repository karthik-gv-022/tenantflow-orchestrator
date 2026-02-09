import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { logActivity } from './useActivityFeed';

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

  // Real-time subscription
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Invalidate and refetch tasks
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);

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

      // Log activity
      if (user && profile?.tenant_id) {
        await logActivity({
          tenantId: profile.tenant_id,
          userId: user.id,
          action: 'created',
          entityType: 'task',
          entityId: data.id,
          entityTitle: data.title
        });

        // Notify assignee if assigned
        if (task.assignee_id && task.assignee_id !== user.id) {
          await supabase.from('notifications').insert([{
            user_id: task.assignee_id,
            tenant_id: profile.tenant_id,
            type: 'assignment',
            title: 'New task assigned',
            message: `${profile.full_name || profile.email} assigned you to "${data.title}"`,
            entity_type: 'task',
            entity_id: data.id
          }]);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
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

      // Log activity
      if (user && profile?.tenant_id) {
        const action = updates.status ? 
          (updates.status === 'completed' ? 'completed' : 'status_changed') : 
          'updated';
        
        await logActivity({
          tenantId: profile.tenant_id,
          userId: user.id,
          action,
          entityType: 'task',
          entityId: id,
          entityTitle: data.title,
          metadata: updates.status ? { new_status: updates.status } : {}
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      // Get task info before deleting for activity log
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;

      // Log activity
      if (user && profile?.tenant_id && taskData) {
        await logActivity({
          tenantId: profile.tenant_id,
          userId: user.id,
          action: 'deleted',
          entityType: 'task',
          entityId: id,
          entityTitle: taskData.title
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
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
