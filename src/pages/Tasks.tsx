import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Task, TaskStatus } from '@/types';

export default function Tasks() {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Handle highlight from notifications
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && tasks.length > 0) {
      const task = tasks.find(t => t.id === highlightId);
      if (task) {
        setSelectedTask(task);
        setSearchParams({});
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateTask.mutate({ id, status });
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
  };

  const handleDelete = (id: string) => {
    deleteTask.mutate(id);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your team's work
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTaskClick={handleTaskClick}
        />

        {/* Create Dialog */}
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={task => createTask.mutate(task)}
        />

        {/* Edit Dialog */}
        <EditTaskDialog
          task={editTask}
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          onSubmit={updates => updateTask.mutate(updates)}
        />

        {/* Task Detail Drawer */}
        <TaskDetailDrawer
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onEdit={(task) => {
            setSelectedTask(null);
            setEditTask(task);
          }}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}
