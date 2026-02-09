import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTeamAnalytics } from '@/hooks/useTeamAnalytics';
import { MemberPerformanceChart } from '@/components/analytics/MemberPerformanceChart';
import { CompletionTimeChart } from '@/components/analytics/CompletionTimeChart';
import { WorkloadDistributionChart } from '@/components/analytics/WorkloadDistributionChart';
import { CompletionTrendChart } from '@/components/analytics/CompletionTrendChart';
import { AnalyticsMetricCard } from '@/components/analytics/AnalyticsMetricCard';
import { Loader2, CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const { 
    memberPerformance, 
    workloadDistribution, 
    completionTrends,
    overallStats,
    isLoading 
  } = useTeamAnalytics();

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics and workload insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsMetricCard
            title="Completed Tasks"
            value={overallStats.totalCompleted}
            subtitle="All time"
            icon={CheckCircle2}
          />
          <AnalyticsMetricCard
            title="Avg Completion Time"
            value={overallStats.avgCompletionHours > 0 ? `${overallStats.avgCompletionHours}h` : 'N/A'}
            subtitle="Hours per task"
            icon={Clock}
            trend={overallStats.avgCompletionHours <= 24 ? 'up' : overallStats.avgCompletionHours > 48 ? 'down' : 'neutral'}
          />
          <AnalyticsMetricCard
            title="Completed This Week"
            value={overallStats.completedThisWeek}
            subtitle="Last 7 days"
            icon={TrendingUp}
            trend={overallStats.completedThisWeek > 0 ? 'up' : 'neutral'}
          />
          <AnalyticsMetricCard
            title="Active Members"
            value={overallStats.activeMembers}
            subtitle="With assigned tasks"
            icon={Users}
          />
        </div>

        {/* Completion Trend */}
        <CompletionTrendChart data={completionTrends} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MemberPerformanceChart data={memberPerformance} />
          <CompletionTimeChart data={memberPerformance} />
        </div>

        {/* Workload Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkloadDistributionChart data={workloadDistribution} />
          
          {/* Top Performers Table */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
            {memberPerformance.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available</p>
            ) : (
              <div className="space-y-3">
                {memberPerformance.slice(0, 5).map((member, index) => (
                  <div 
                    key={member.memberId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{member.memberName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.totalTasks} total tasks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-status-completed">{member.completedTasks}</p>
                      <p className="text-xs text-muted-foreground">completed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
