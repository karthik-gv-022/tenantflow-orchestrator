import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Loader2, FolderKanban, ArrowLeft } from 'lucide-react';
import { Project, Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statusStyles: Record<TaskStatus, string> = {
  created: 'bg-status-created/20 text-status-created',
  in_progress: 'bg-status-in-progress/20 text-status-in-progress',
  review: 'bg-status-review/20 text-status-review',
  completed: 'bg-status-completed/20 text-status-completed'
};

const statusLabels: Record<TaskStatus, string> = {
  created: 'Created',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed'
};

export default function Projects() {
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects();
  const { tasks } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const handleSaveEdit = () => {
    if (editProject) {
      updateProject.mutate({
        id: editProject.id,
        name: editName,
        description: editDescription || null
      });
      setEditProject(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this project and all its tasks?')) {
      deleteProject.mutate(id);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
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

  // Project detail view
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.project_id === selectedProject.id);
    
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedProject.name}</h1>
              <p className="text-muted-foreground mt-1">
                {selectedProject.description || 'No description'}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Tasks ({projectTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {projectTasks.length > 0 ? (
                <div className="space-y-3">
                  {projectTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Badge className={cn('text-xs', statusStyles[task.status])}>
                        {statusLabels[task.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No tasks in this project yet</p>
                  <p className="text-sm">Create tasks and assign them to this project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Organize tasks into projects
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={tasks}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={setSelectedProject}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderKanban className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Projects Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Create your first project to organize and group related tasks.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}

        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={project => createProject.mutate(project)}
        />

        {/* Edit Dialog */}
        <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
