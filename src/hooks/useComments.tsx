import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Profile } from '@/types';

export interface TaskComment {
  id: string;
  task_id: string;
  tenant_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  replies?: TaskComment[];
}

export function useComments(taskId: string | null) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      // Fetch user profiles for comments
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      // Build threaded structure
      const commentsWithUsers = (data || []).map(c => ({
        ...c,
        user: profileMap.get(c.user_id) || null
      })) as TaskComment[];
      
      // Separate top-level and replies
      const topLevel = commentsWithUsers.filter(c => !c.parent_id);
      const replies = commentsWithUsers.filter(c => c.parent_id);
      
      // Attach replies to parents
      return topLevel.map(c => ({
        ...c,
        replies: replies.filter(r => r.parent_id === c.id)
      }));
    },
    enabled: !!taskId
  });

  // Real-time subscription for comments
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  const addComment = useMutation({
    mutationFn: async ({ content, mentions = [], parentId }: { 
      content: string; 
      mentions?: string[]; 
      parentId?: string | null 
    }) => {
      if (!user || !profile?.tenant_id || !taskId) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          tenant_id: profile.tenant_id,
          user_id: user.id,
          content,
          mentions,
          parent_id: parentId || null
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for mentioned users
      if (mentions.length > 0) {
        const task = await supabase
          .from('tasks')
          .select('title')
          .eq('id', taskId)
          .single();

        const notifications = mentions.map(mentionedUserId => ({
          user_id: mentionedUserId,
          tenant_id: profile.tenant_id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${profile.full_name || profile.email} mentioned you in a comment on "${task.data?.title}"`,
          entity_type: 'task',
          entity_id: taskId
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Log activity
      const task = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();

      await supabase.from('activity_feed').insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        action: 'commented',
        entity_type: 'task',
        entity_id: taskId,
        entity_title: task.data?.title,
        metadata: { comment_id: data.id }
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .update({ content })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {
    comments,
    isLoading,
    addComment,
    updateComment,
    deleteComment
  };
}
