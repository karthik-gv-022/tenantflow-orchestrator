import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart';
import { RecentTasks } from '@/components/dashboard/RecentTasks';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { PredictionAlerts } from '@/components/predictions/PredictionAlerts';
import { useTasks } from '@/hooks/useTasks';
import { useDelayPrediction } from '@/hooks/useDelayPrediction';
import { useAuth } from '@/hooks/useAuth';
import {
  ListTodo,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const { tasks, overdueTasks, tasksByStatus, isLoading } = useTasks();
  const { predictions, tasksAtRisk, getTaskPrediction } = useDelayPrediction();

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            title="At Risk"
            value={tasksAtRisk.length}
            icon={TrendingUp}
            change={tasksAtRisk.length > 0 ? 'Predicted delays' : 'All on track'}
            changeType={tasksAtRisk.length > 0 ? 'negative' : 'positive'}
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

        {/* Activity Feed, Prediction Alerts, and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivityFeed limit={10} compact />
          <PredictionAlerts 
            tasksAtRisk={tasksAtRisk} 
            predictions={predictions} 
            getTaskPrediction={getTaskPrediction} 
          />
          <AlertsPanel overdueTasks={overdueTasks} tasks={tasks} />
        </div>
      </div>
    </DashboardLayout>
  );
}
