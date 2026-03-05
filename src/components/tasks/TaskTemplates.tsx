import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@/types';
import { FilePlus2, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: TaskPriority;
  sla_hours: number | null;
}

// Store templates in localStorage for now
const TEMPLATES_KEY = 'task_templates';

function loadTemplates(): TaskTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : defaultTemplates;
  } catch {
    return defaultTemplates;
  }
}

function saveTemplates(templates: TaskTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

const defaultTemplates: TaskTemplate[] = [
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    title: '[Bug] ',
    description: '**Issue:**\n\n**Steps to reproduce:**\n1. \n\n**Expected behavior:**\n\n**Actual behavior:**',
    priority: 'high',
    sla_hours: 24
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    title: '[Feature] ',
    description: '**Description:**\n\n**User story:**\nAs a [user type], I want [goal] so that [benefit].\n\n**Acceptance criteria:**\n- [ ] ',
    priority: 'medium',
    sla_hours: 72
  },
  {
    id: 'code-review',
    name: 'Code Review',
    title: '[Review] ',
    description: '**PR Link:**\n\n**Changes:**\n\n**Testing notes:**',
    priority: 'medium',
    sla_hours: 8
  }
];

interface TaskTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TaskTemplate) => void;
}

export function TaskTemplates({ open, onOpenChange, onSelectTemplate }: TaskTemplatesProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>(loadTemplates);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = (template: TaskTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    toast.success('Template deleted');
  };

  const handleSave = (template: TaskTemplate) => {
    const isNew = !templates.find(t => t.id === template.id);
    const updated = isNew
      ? [...templates, template]
      : templates.map(t => t.id === template.id ? template : t);
    setTemplates(updated);
    saveTemplates(updated);
    setEditingTemplate(null);
    setIsCreating(false);
    toast.success(isNew ? 'Template created' : 'Template updated');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="w-5 h-5" />
              Task Templates
            </DialogTitle>
            <DialogDescription>
              Choose a template to quickly create tasks with predefined settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {templates.map(template => (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelect(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {template.priority}
                        </Badge>
                        {template.sla_hours && (
                          <Badge variant="secondary" className="text-xs">
                            {template.sla_hours}h SLA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description.slice(0, 100)}...
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(true);
                setEditingTemplate({
                  id: crypto.randomUUID(),
                  name: '',
                  title: '',
                  description: '',
                  priority: 'medium',
                  sla_hours: null
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Template Dialog */}
      <TemplateEditor
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
            setIsCreating(false);
          }
        }}
        onSave={handleSave}
        isNew={isCreating}
      />
    </>
  );
}

interface TemplateEditorProps {
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: TaskTemplate) => void;
  isNew: boolean;
}

function TemplateEditor({ template, open, onOpenChange, onSave, isNew }: TemplateEditorProps) {
  const [form, setForm] = useState<TaskTemplate | null>(template);

  // Update form when template changes
  if (template && template.id !== form?.id) {
    setForm(template);
  }

  if (!form) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim()) {
      toast.error('Name and title prefix are required');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Create Template' : 'Edit Template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Bug Fix, Feature Request"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title Prefix</Label>
            <Input
              id="title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. [Bug] , [Feature] "
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description Template</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Template content with placeholders..."
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v: TaskPriority) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla">Default SLA (hours)</Label>
              <Input
                id="sla"
                type="number"
                value={form.sla_hours || ''}
                onChange={e => setForm({
                  ...form,
                  sla_hours: e.target.value ? parseInt(e.target.value) : null
                })}
                placeholder="Optional"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
