import { Task, TaskStatus, TaskPriority } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  MoreHorizontal,
  ArrowRight,
  Trash2,
  Edit,
  User
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const statusStyles: Record<TaskStatus, string> = {
  created: 'bg-status-created/20 text-status-created border-status-created/30',
  in_progress: 'bg-status-in-progress/20 text-status-in-progress border-status-in-progress/30',
  review: 'bg-status-review/20 text-status-review border-status-review/30',
  completed: 'bg-status-completed/20 text-status-completed border-status-completed/30'
};

const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-priority-low/20 text-priority-low',
  medium: 'bg-priority-medium/20 text-priority-medium',
  high: 'bg-priority-high/20 text-priority-high',
  critical: 'bg-priority-critical/20 text-priority-critical'
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  created: 'in_progress',
  in_progress: 'review',
  review: 'completed',
  completed: null
};

const statusLabels: Record<TaskStatus, string> = {
  created: 'Created',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed'
};

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const isOverdue =
    task.due_date &&
    task.status !== 'completed' &&
    new Date(task.due_date) < new Date();

  const assigneeInitials = task.assignee?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  const next = nextStatus[task.status];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md',
        isOverdue && 'ring-2 ring-destructive/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn('text-xs', priorityStyles[task.priority])}
              >
                {task.priority}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mb-1 line-clamp-2">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {next && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, next)}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move to {statusLabels[next]}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.due_date && (
              <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive')}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.project && (
              <span className="truncate max-w-[100px]">{task.project.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', statusStyles[task.status])}>
              {statusLabels[task.status]}
            </Badge>
            {task.assignee && (
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {assigneeInitials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
