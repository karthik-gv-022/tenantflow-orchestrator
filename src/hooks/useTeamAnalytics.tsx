import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { useTeamMembers } from './useTeamMembers';
import { Task, Profile } from '@/types';
import { differenceInHours } from 'date-fns';

export interface MemberPerformance {
  memberId: string;
  memberName: string;
  completedTasks: number;
  inProgressTasks: number;
  totalTasks: number;
  avgCompletionTimeHours: number | null;
}

export interface WorkloadDistribution {
  name: string;
  value: number;
  memberId: string;
}

export interface CompletionTrend {
  date: string;
  completed: number;
}

export function useTeamAnalytics() {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { members, isLoading: membersLoading } = useTeamMembers();

  const memberPerformance = useMemo((): MemberPerformance[] => {
    if (!members.length) return [];

    return members.map((member) => {
      const memberTasks = tasks.filter(t => t.assignee_id === member.user_id);
      const completedTasks = memberTasks.filter(t => t.status === 'completed');
      const inProgressTasks = memberTasks.filter(t => t.status === 'in_progress');

      // Calculate average completion time (from started_at to completed_at)
      const completionTimes = completedTasks
        .filter(t => t.started_at && t.completed_at)
        .map(t => differenceInHours(new Date(t.completed_at!), new Date(t.started_at!)));

      const avgCompletionTimeHours = completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : null;

      return {
        memberId: member.user_id,
        memberName: member.full_name || member.email.split('@')[0],
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        totalTasks: memberTasks.length,
        avgCompletionTimeHours
      };
    }).sort((a, b) => b.completedTasks - a.completedTasks);
  }, [tasks, members]);

  const workloadDistribution = useMemo((): WorkloadDistribution[] => {
    if (!members.length) return [];

    const distribution = members
      .map((member) => {
        const activeTasks = tasks.filter(
          t => t.assignee_id === member.user_id && t.status !== 'completed'
        );
        return {
          name: member.full_name || member.email.split('@')[0],
          value: activeTasks.length,
          memberId: member.user_id
        };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return distribution;
  }, [tasks, members]);

  const completionTrends = useMemo((): CompletionTrend[] => {
    const last7Days: CompletionTrend[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completedOnDay = tasks.filter(t => {
        if (!t.completed_at) return false;
        return t.completed_at.startsWith(dateStr);
      }).length;

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: completedOnDay
      });
    }

    return last7Days;
  }, [tasks]);

  const overallStats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    // Average completion time across all tasks
    const completionTimes = completedTasks
      .filter(t => t.started_at && t.completed_at)
      .map(t => differenceInHours(new Date(t.completed_at!), new Date(t.started_at!)));

    const avgCompletionHours = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    // Tasks completed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = completedTasks.filter(t => 
      t.completed_at && new Date(t.completed_at) >= weekAgo
    ).length;

    return {
      totalCompleted: completedTasks.length,
      avgCompletionHours,
      completedThisWeek,
      activeMembers: members.filter(m => 
        tasks.some(t => t.assignee_id === m.user_id && t.status !== 'completed')
      ).length
    };
  }, [tasks, members]);

  return {
    memberPerformance,
    workloadDistribution,
    completionTrends,
    overallStats,
    isLoading: tasksLoading || membersLoading
  };
}
