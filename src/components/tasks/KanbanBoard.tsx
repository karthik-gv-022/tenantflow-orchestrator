import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { Circle, Play, Eye, CheckCircle } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const columns: { status: TaskStatus; label: string; icon: React.ElementType }[] = [
  { status: 'created', label: 'Created', icon: Circle },
  { status: 'in_progress', label: 'In Progress', icon: Play },
  { status: 'review', label: 'In Review', icon: Eye },
  { status: 'completed', label: 'Completed', icon: CheckCircle }
];

const columnStyles: Record<TaskStatus, string> = {
  created: 'border-t-status-created',
  in_progress: 'border-t-status-in-progress',
  review: 'border-t-status-review',
  completed: 'border-t-status-completed'
};

export function KanbanBoard({ tasks, onStatusChange, onEdit, onDelete }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map(({ status, label, icon: Icon }) => {
        const columnTasks = tasks.filter(t => t.status === status);
        return (
          <div key={status} className="space-y-4">
            <div
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg bg-card border border-t-4',
                columnStyles[status]
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
              <span className="ml-auto bg-muted px-2 py-0.5 rounded-full text-xs font-medium">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {columnTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              {columnTasks.length === 0 && (
                <div className="flex items-center justify-center h-[100px] border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
