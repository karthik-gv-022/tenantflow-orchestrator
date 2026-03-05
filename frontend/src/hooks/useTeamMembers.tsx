import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Profile } from '@/types';
import { useAuth } from './useAuth';

export function useTeamMembers() {
  const { profile } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await apiClient
        .table('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile?.tenant_id
  });

  return { members, isLoading };
}




