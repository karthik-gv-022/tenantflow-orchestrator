import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { TaskFilters, TaskFiltersState, defaultFilters, applyFilters } from '@/components/tasks/TaskFilters';
import { TaskTemplates, TaskTemplate } from '@/components/tasks/TaskTemplates';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Plus, FilePlus2, Loader2 } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function Tasks() {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFiltersState>(defaultFilters);
  const [templateDefaults, setTemplateDefaults] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    sla_hours: number | null;
  } | null>(null);

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

  const filteredTasks = applyFilters(tasks, filters);

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

  const handleTemplateSelect = (template: TaskTemplate) => {
    setTemplateDefaults({
      title: template.title,
      description: template.description,
      priority: template.priority,
      sla_hours: template.sla_hours
    });
    setCreateOpen(true);
  };

  const handleCreateDialogClose = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setTemplateDefaults(null);
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Blank Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                <FilePlus2 className="w-4 h-4 mr-2" />
                From Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Advanced Filters */}
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          tasks={tasks}
          filteredCount={filteredTasks.length}
        />

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
          onOpenChange={handleCreateDialogClose}
          onSubmit={task => createTask.mutate(task)}
          defaultValues={templateDefaults}
        />

        {/* Task Templates */}
        <TaskTemplates
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          onSelectTemplate={handleTemplateSelect}
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
