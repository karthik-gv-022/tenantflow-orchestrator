import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  MessageSquare,
  UserPlus,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityFeedProps {
  limit?: number;
  compact?: boolean;
  className?: string;
}

const actionIcons: Record<string, React.ElementType> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  status_changed: ArrowRight,
  commented: MessageSquare,
  assigned: UserPlus,
  completed: CheckCircle
};

const actionLabels: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  status_changed: 'changed status of',
  commented: 'commented on',
  assigned: 'assigned',
  completed: 'completed'
};

export function ActivityFeed({ limit = 20, compact = false, className }: ActivityFeedProps) {
  const { activities, isLoading } = useActivityFeed(limit);
  const navigate = useNavigate();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleActivityClick = (activity: typeof activities[0]) => {
    if (activity.entity_type === 'task' && activity.entity_id) {
      navigate(`/tasks?highlight=${activity.entity_id}`);
    } else if (activity.entity_type === 'project' && activity.entity_id) {
      navigate(`/projects`);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : undefined}>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-[250px]' : 'h-[400px]'}>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const Icon = actionIcons[activity.action] || Activity;
                  const actionLabel = actionLabels[activity.action] || activity.action;
                  
                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 pl-10 group cursor-pointer"
                      onClick={() => handleActivityClick(activity)}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center',
                        activity.action === 'completed' && 'bg-status-completed',
                        activity.action === 'created' && 'bg-status-created',
                        activity.action === 'commented' && 'bg-primary',
                        !['completed', 'created', 'commented'].includes(activity.action) && 'bg-muted-foreground'
                      )}>
                        <Icon className="w-2 h-2 text-primary-foreground" />
                      </div>
                      
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(activity.user?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {activity.user?.full_name || activity.user?.email || 'Someone'}
                          </span>
                          {' '}
                          <span className="text-muted-foreground">{actionLabel}</span>
                          {' '}
                          {activity.entity_title && (
                            <span className="font-medium text-primary group-hover:underline">
                              {activity.entity_title}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
