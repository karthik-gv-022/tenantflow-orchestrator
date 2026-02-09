import { Task, TaskStatus, TaskPriority } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskComments } from './TaskComments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  FolderOpen,
  AlertTriangle,
  Edit,
  ArrowRight,
  X
} from 'lucide-react';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
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

const statusLabels: Record<TaskStatus, string> = {
  created: 'Created',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed'
};

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  created: 'in_progress',
  in_progress: 'review',
  review: 'completed',
  completed: null
};

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onEdit,
  onStatusChange
}: TaskDetailDrawerProps) {
  if (!task) return null;

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className={cn('text-xs', priorityStyles[task.priority])}
                >
                  {task.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', statusStyles[task.status])}
                >
                  {statusLabels[task.status]}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl font-semibold text-left">
                {task.title}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Assignee
              </span>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {assigneeInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {task.assignee.full_name || task.assignee.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="w-3 h-3" />
                Project
              </span>
              <span className="text-sm font-medium">
                {task.project?.name || 'No project'}
              </span>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due Date
              </span>
              <span className={cn(
                'text-sm font-medium',
                isOverdue && 'text-destructive'
              )}>
                {task.due_date
                  ? format(new Date(task.due_date), 'MMM d, yyyy')
                  : 'No due date'}
              </span>
            </div>

            {/* SLA */}
            {task.sla_hours && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  SLA
                </span>
                <span className="text-sm font-medium">
                  {task.sla_hours} hours
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
            {next && (
              <Button
                size="sm"
                onClick={() => onStatusChange(task.id, next)}
                className="flex-1"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Move to {statusLabels[next]}
              </Button>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-4">Comments</h4>
            <TaskComments taskId={task.id} className="h-[300px]" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
