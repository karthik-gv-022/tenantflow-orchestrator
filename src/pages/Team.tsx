import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { Profile, AppRole } from '@/types';
import {
  Loader2,
  Users,
  ShieldCheck,
  ListChecks,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

const roleStyles: Record<AppRole, string> = {
  system_admin: 'bg-destructive/20 text-destructive',
  tenant_admin: 'bg-primary/20 text-primary',
  manager: 'bg-accent/20 text-accent-foreground',
  team_lead: 'bg-[hsl(var(--status-review))]/20 text-[hsl(var(--status-review))]',
  team_member: 'bg-muted text-muted-foreground',
};

const roleLabels: Record<AppRole, string> = {
  system_admin: 'System Admin',
  tenant_admin: 'Tenant Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  team_member: 'Team Member',
};

const allRoles: AppRole[] = ['team_member', 'team_lead', 'manager', 'tenant_admin', 'system_admin'];

type MemberWithRoles = Profile & { roles: AppRole[] };

function MemberStatsCards({ members, tasks }: { members: MemberWithRoles[]; tasks: ReturnType<typeof useTasks>['tasks'] }) {
  const totalMembers = members.length;
  const admins = members.filter(m => m.roles.some(r => ['system_admin', 'tenant_admin', 'manager'].includes(r))).length;
  const activeTasks = tasks.filter(t => t.status !== 'completed').length;
  const overdue = tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date()).length;

  const stats = [
    { icon: Users, label: 'Total Members', value: totalMembers, color: 'text-primary' },
    { icon: ShieldCheck, label: 'Admins / Managers', value: admins, color: 'text-accent' },
    { icon: ListChecks, label: 'Active Tasks', value: activeTasks, color: 'text-primary' },
    { icon: AlertTriangle, label: 'Overdue Tasks', value: overdue, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={cn('w-8 h-8', s.color)} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RoleChanger({ member, isAdmin }: { member: MemberWithRoles; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const currentRole = member.roles[0] || 'team_member';

  const updateRole = useMutation({
    mutationFn: async (newRole: AppRole) => {
      // Delete existing roles for user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', member.user_id);
      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: member.user_id, role: newRole });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success(`Role updated for ${member.full_name || member.email}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAdmin) {
    return (
      <Badge variant="secondary" className={cn('text-xs', roleStyles[currentRole])}>
        {roleLabels[currentRole]}
      </Badge>
    );
  }

  return (
    <Select
      defaultValue={currentRole}
      onValueChange={(v) => updateRole.mutate(v as AppRole)}
      disabled={updateRole.isPending}
    >
      <SelectTrigger className="w-[150px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allRoles.map(role => (
          <SelectItem key={role} value={role} className="text-xs">
            {roleLabels[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Team() {
  const { profile, hasRole } = useAuth();
  const { tasks } = useTasks();
  const isAdmin = hasRole('tenant_admin') || hasRole('system_admin') || hasRole('manager');

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id);
      if (error) throw error;

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
        roles: rolesMap[p.user_id] || ['team_member'],
      })) as MemberWithRoles[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Build per-member task stats
  const memberStats = teamMembers.reduce((acc, m) => {
    const memberTasks = tasks.filter(t => t.assignee_id === m.user_id);
    acc[m.user_id] = {
      total: memberTasks.length,
      completed: memberTasks.filter(t => t.status === 'completed').length,
      inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
      overdue: memberTasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date()).length,
    };
    return acc;
  }, {} as Record<string, { total: number; completed: number; inProgress: number; overdue: number }>);

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
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Manage roles, monitor workloads, and oversee your team members.'
              : "View your organization's team members."}
          </p>
        </div>

        <MemberStatsCards members={teamMembers} tasks={tasks} />

        {/* Members table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Tasks</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map(member => {
                  const stats = memberStats[member.user_id] || { total: 0, completed: 0, inProgress: 0, overdue: 0 };
                  const initials = member.full_name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || 'U';

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{member.full_name || 'Unnamed User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleChanger member={member} isAdmin={isAdmin} />
                      </TableCell>
                      <TableCell className="text-center font-medium">{stats.total}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-[hsl(var(--status-completed))]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {stats.completed}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Clock className="w-3.5 h-3.5" /> {stats.inProgress}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn('inline-flex items-center gap-1', stats.overdue > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          <AlertTriangle className="w-3.5 h-3.5" /> {stats.overdue}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {teamMembers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-2">No team members yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Team members will appear here once they join your organization.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
