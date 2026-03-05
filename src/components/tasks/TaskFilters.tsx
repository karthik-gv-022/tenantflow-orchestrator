import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Filter,
  Calendar as CalendarIcon,
  X,
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { TaskStatus, TaskPriority, Task } from '@/types';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProjects } from '@/hooks/useProjects';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export interface TaskFiltersState {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeIds: string[];
  projectIds: string[];
  dateRange: { from?: Date; to?: Date };
  showOverdueOnly: boolean;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  tasks: Task[];
  filteredCount: number;
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'created', label: 'Created' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'completed', label: 'Completed' }
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

export const defaultFilters: TaskFiltersState = {
  search: '',
  statuses: [],
  priorities: [],
  assigneeIds: [],
  projectIds: [],
  dateRange: {},
  showOverdueOnly: false
};

export function TaskFilters({ filters, onFiltersChange, tasks, filteredCount }: TaskFiltersProps) {
  const { members } = useTeamMembers();
  const { projects } = useProjects();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = [
    filters.statuses.length > 0,
    filters.priorities.length > 0,
    filters.assigneeIds.length > 0,
    filters.projectIds.length > 0,
    filters.dateRange.from || filters.dateRange.to,
    filters.showOverdueOnly
  ].filter(Boolean).length;

  const toggleStatus = (status: TaskStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const togglePriority = (priority: TaskPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const toggleAssignee = (assigneeId: string) => {
    const newAssignees = filters.assigneeIds.includes(assigneeId)
      ? filters.assigneeIds.filter(a => a !== assigneeId)
      : [...filters.assigneeIds, assigneeId];
    onFiltersChange({ ...filters, assigneeIds: newAssignees });
  };

  const toggleProject = (projectId: string) => {
    const newProjects = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter(p => p !== projectId)
      : [...filters.projectIds, projectId];
    onFiltersChange({ ...filters, projectIds: newProjects });
  };

  const clearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filter Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.statuses.includes(opt.value)}
                        onCheckedChange={() => toggleStatus(opt.value)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Priority</Label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.priorities.includes(opt.value)}
                        onCheckedChange={() => togglePriority(opt.value)}
                      />
                      <span className="text-sm capitalize">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Assignee</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {members.map(member => (
                    <label key={member.user_id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.assigneeIds.includes(member.user_id)}
                        onCheckedChange={() => toggleAssignee(member.user_id)}
                      />
                      <span className="text-sm truncate">{member.full_name || member.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Project</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {projects.map(project => (
                    <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filters.projectIds.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <span className="text-sm truncate">{project.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm">Due Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? format(filters.dateRange.from, 'MMM d') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => onFiltersChange({
                          ...filters,
                          dateRange: { ...filters.dateRange, from: date }
                        })}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange.to ? format(filters.dateRange.to, 'MMM d') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => onFiltersChange({
                          ...filters,
                          dateRange: { ...filters.dateRange, to: date }
                        })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Overdue Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.showOverdueOnly}
                  onCheckedChange={(checked) => onFiltersChange({
                    ...filters,
                    showOverdueOnly: !!checked
                  })}
                />
                <span className="text-sm">Show overdue tasks only</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToCSV(tasks)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToPDF(tasks)}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredCount} of {tasks.length} tasks
          </span>
          {filters.statuses.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {status.replace('_', ' ')}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => toggleStatus(status)}
              />
            </Badge>
          ))}
          {filters.priorities.map(priority => (
            <Badge key={priority} variant="secondary" className="gap-1 capitalize">
              {priority}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => togglePriority(priority)}
              />
            </Badge>
          ))}
          {filters.showOverdueOnly && (
            <Badge variant="destructive" className="gap-1">
              Overdue only
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, showOverdueOnly: false })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function applyFilters(tasks: Task[], filters: TaskFiltersState): Task[] {
  return tasks.filter(task => {
    // Search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !task.title.toLowerCase().includes(searchLower) &&
        !task.description?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }

    // Priority
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }

    // Assignee
    if (filters.assigneeIds.length > 0) {
      if (!task.assignee_id || !filters.assigneeIds.includes(task.assignee_id)) {
        return false;
      }
    }

    // Project
    if (filters.projectIds.length > 0) {
      if (!task.project_id || !filters.projectIds.includes(task.project_id)) {
        return false;
      }
    }

    // Date Range
    if (filters.dateRange.from && task.due_date) {
      if (new Date(task.due_date) < filters.dateRange.from) {
        return false;
      }
    }
    if (filters.dateRange.to && task.due_date) {
      if (new Date(task.due_date) > filters.dateRange.to) {
        return false;
      }
    }

    // Overdue Only
    if (filters.showOverdueOnly) {
      if (!task.due_date || task.status === 'completed') return false;
      if (new Date(task.due_date) >= new Date()) return false;
    }

    return true;
  });
}
