import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { Profile } from '@/types';

export interface ActivityItem {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export function useActivityFeed(limit = 20) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity-feed', profile?.tenant_id, limit],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      return (data || []).map(a => ({
        ...a,
        user: profileMap.get(a.user_id) || null
      })) as ActivityItem[];
    },
    enabled: !!profile?.tenant_id
  });

  // Real-time subscription
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `tenant_id=eq.${profile.tenant_id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);

  return { activities, isLoading };
}

// Helper to log activities from other hooks
export async function logActivity(params: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.from('activity_feed').insert([{
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      entity_title: params.entityTitle || null,
      metadata: (params.metadata || {}) as unknown as Record<string, never>
    }]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
