import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Clock, User } from 'lucide-react';

interface RecentTasksProps {
  tasks: Task[];
}

const statusStyles: Record<TaskStatus, string> = {
  created: 'bg-status-created/20 text-status-created border-status-created/30',
  in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
  review: 'bg-status-review/20 text-status-review border-status-review/30',
  completed: 'bg-status-completed/20 text-status-completed border-status-completed/30'
};

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-priority-low/20 text-priority-low border-priority-low/30',
  medium: 'bg-priority-medium/20 text-priority-medium border-priority-medium/30',
  high: 'bg-priority-high/20 text-priority-high border-priority-high/30',
  critical: 'bg-priority-critical/20 text-priority-critical border-priority-critical/30'
};

const statusLabels: Record<TaskStatus, string> = {
  created: 'Created',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed'
};

export function RecentTasks({ tasks }: RecentTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.slice(0, 5).map(task => (
          <div
            key={task.id}
            className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{task.title}</h4>
                <Badge
                  variant="outline"
                  className={cn('text-xs shrink-0', priorityStyles[task.priority])}
                >
                  {task.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {task.assignee && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assignee.full_name || task.assignee.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('shrink-0', statusStyles[task.status])}
            >
              {statusLabels[task.status]}
            </Badge>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No tasks yet. Create your first task!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
