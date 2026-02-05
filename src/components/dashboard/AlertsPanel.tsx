import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  overdueTasks: Task[];
  tasks: Task[];
}

export function AlertsPanel({ overdueTasks, tasks }: AlertsPanelProps) {
  const upcomingDeadlines = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
  });

  const bottlenecks = tasks.filter(t => {
    if (t.status !== 'review') return false;
    const dayInReview = (new Date().getTime() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return dayInReview > 2;
  });

  const alerts = [
    {
      type: 'critical',
      icon: AlertTriangle,
      title: 'Overdue Tasks',
      count: overdueTasks.length,
      message: `${overdueTasks.length} task${overdueTasks.length !== 1 ? 's' : ''} past due date`
    },
    {
      type: 'warning',
      icon: Clock,
      title: 'Upcoming Deadlines',
      count: upcomingDeadlines.length,
      message: `${upcomingDeadlines.length} task${upcomingDeadlines.length !== 1 ? 's' : ''} due within 24 hours`
    },
    {
      type: 'info',
      icon: TrendingUp,
      title: 'Review Bottleneck',
      count: bottlenecks.length,
      message: `${bottlenecks.length} task${bottlenecks.length !== 1 ? 's' : ''} stuck in review`
    }
  ].filter(a => a.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-status-review" />
          Intelligent Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border',
              alert.type === 'critical' && 'bg-destructive/10 border-destructive/30',
              alert.type === 'warning' && 'bg-status-review/10 border-status-review/30',
              alert.type === 'info' && 'bg-primary/10 border-primary/30'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                alert.type === 'critical' && 'bg-destructive/20',
                alert.type === 'warning' && 'bg-status-review/20',
                alert.type === 'info' && 'bg-primary/20'
              )}
            >
              <alert.icon
                className={cn(
                  'w-5 h-5',
                  alert.type === 'critical' && 'text-destructive',
                  alert.type === 'warning' && 'text-status-review',
                  alert.type === 'info' && 'text-primary'
                )}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">{alert.title}</p>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
            <span className="text-2xl font-bold">{alert.count}</span>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No alerts at this time</p>
            <p className="text-sm">All tasks are on track!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
