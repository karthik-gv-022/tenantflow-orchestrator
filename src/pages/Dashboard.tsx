import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import {
  ListTodo,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const { tasks, overdueTasks, tasksByStatus, isLoading } = useTasks();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const completedTasks = tasksByStatus.completed || 0;
  const inProgressTasks = tasksByStatus.in_progress || 0;
  const completionRate = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.full_name || 'User'}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Tasks"
            value={tasks.length}
            icon={ListTodo}
            change={`${tasks.length} in system`}
          />
          <MetricCard
            title="Completed"
            value={completedTasks}
            icon={CheckCircle}
            change={`${completionRate}% completion rate`}
            changeType="positive"
          />
          <MetricCard
            title="In Progress"
            value={inProgressTasks}
            icon={Clock}
            change="Active work items"
          />
          <MetricCard
            title="Overdue"
            value={overdueTasks.length}
            icon={AlertTriangle}
            change={overdueTasks.length > 0 ? 'Needs attention' : 'All on track'}
            changeType={overdueTasks.length > 0 ? 'negative' : 'positive'}
          />
        </div>

        {/* Charts and Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTasks tasks={tasks} />
          </div>
          <div className="space-y-6">
            <TaskStatusChart data={tasksByStatus} />
          </div>
        </div>

        {/* Activity Feed and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed limit={10} compact />
          <AlertsPanel overdueTasks={overdueTasks} tasks={tasks} />
        </div>
      </div>
    </DashboardLayout>
  );
}
