import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile, AppRole } from '@/types';
import { Loader2, Users, ShieldCheck, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleStyles: Record<AppRole, string> = {
  system_admin: 'bg-destructive/20 text-destructive',
  tenant_admin: 'bg-primary/20 text-primary',
  manager: 'bg-accent/20 text-accent-foreground',
  team_lead: 'bg-status-review/20 text-status-review',
  team_member: 'bg-muted text-muted-foreground'
};

const roleLabels: Record<AppRole, string> = {
  system_admin: 'System Admin',
  tenant_admin: 'Tenant Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  team_member: 'Team Member'
};

export default function Team() {
  const { profile } = useAuth();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id);
      
      if (error) throw error;

      // Fetch roles for each profile
      const memberIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', memberIds);

      const rolesMap = (roles || []).reduce((acc, r) => {
        if (!acc[r.user_id]) acc[r.user_id] = [];
        acc[r.user_id].push(r.role as AppRole);
        return acc;
      }, {} as Record<string, AppRole[]>);

      return profiles.map(p => ({
        ...p,
        roles: rolesMap[p.user_id] || ['team_member']
      }));
    },
    enabled: !!profile?.tenant_id
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's team members
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member: Profile & { roles: AppRole[] }) => {
            const initials = member.full_name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || 'U';

            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {member.full_name || 'Unnamed User'}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.roles.map(role => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className={cn('text-xs', roleStyles[role])}
                          >
                            {roleLabels[role]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {teamMembers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-2">No team members yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Team members will appear here once they join your organization.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
