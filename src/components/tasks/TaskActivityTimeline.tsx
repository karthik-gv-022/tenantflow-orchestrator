import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Circle,
  CheckCircle,
  PlayCircle,
  Eye,
  MessageSquare,
  User,
  Edit,
  Trash2
} from 'lucide-react';

interface ActivityEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  created_at: string;
  user_id: string;
  metadata: Record<string, unknown> | null;
  user?: {
    full_name: string | null;
    email: string;
  };
}

interface TaskActivityTimelineProps {
  taskId: string;
  className?: string;
}

const actionIcons: Record<string, React.ElementType> = {
  created: Circle,
  status_changed: PlayCircle,
  completed: CheckCircle,
  updated: Edit,
  deleted: Trash2,
  commented: MessageSquare,
  assigned: User,
  reviewed: Eye
};

const actionColors: Record<string, string> = {
  created: 'text-status-created bg-status-created/20',
  status_changed: 'text-status-in-progress bg-status-in-progress/20',
  completed: 'text-status-completed bg-status-completed/20',
  updated: 'text-primary bg-primary/20',
  deleted: 'text-destructive bg-destructive/20',
  commented: 'text-muted-foreground bg-muted',
  assigned: 'text-primary bg-primary/20',
  reviewed: 'text-status-review bg-status-review/20'
};

function getActionDescription(event: ActivityEvent): string {
  const userName = event.user?.full_name || event.user?.email || 'Someone';
  
  switch (event.action) {
    case 'created':
      return `${userName} created this task`;
    case 'status_changed':
      const newStatus = (event.metadata?.new_status as string)?.replace('_', ' ') || 'changed status';
      return `${userName} moved to ${newStatus}`;
    case 'completed':
      return `${userName} marked as completed`;
    case 'updated':
      return `${userName} updated this task`;
    case 'commented':
      return `${userName} added a comment`;
    case 'assigned':
      return `${userName} was assigned`;
    default:
      return `${userName} ${event.action}`;
  }
}

export function TaskActivityTimeline({ taskId, className }: TaskActivityTimelineProps) {
  const { profile } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      // First get activities
      const { data: activityData, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('entity_id', taskId)
        .eq('entity_type', 'task')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching task activity:', error);
        return [];
      }
      
      // Get unique user IDs and fetch profiles
      const userIds = [...new Set(activityData.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      // Merge user data
      return activityData.map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id) || null
      })) as ActivityEvent[];
    },
    enabled: !!profile?.tenant_id && !!taskId
  });

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('pr-4', className)}>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        
        <div className="space-y-4">
          {activities.map((event, index) => {
            const Icon = actionIcons[event.action] || Circle;
            const colorClass = actionColors[event.action] || 'text-muted-foreground bg-muted';
            
            return (
              <div key={event.id} className="relative flex gap-3 pl-1">
                {/* Icon */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-8 h-8 rounded-full',
                  colorClass
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-1">
                  <p className="text-sm">{getActionDescription(event)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
