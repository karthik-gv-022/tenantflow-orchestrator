import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types';
import { PredictionResult, PredictionFactors } from '@/types/prediction';
import { Zap, ArrowRight, UserCheck, CalendarClock, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRiskLevelColor } from '@/services/delayPrediction';

interface UrgentAction {
  task: Task;
  prediction: PredictionResult;
  actionType: 'reassign' | 'extend_deadline' | 'split_work' | 'escalate';
  actionLabel: string;
  actionDescription: string;
  icon: React.ElementType;
  urgency: number; // Higher = more urgent
}

interface UrgentActionsPanelProps {
  tasks: Task[];
  getPrediction: (task: Task) => PredictionResult | null;
}

const actionIcons = {
  reassign: UserCheck,
  extend_deadline: CalendarClock,
  split_work: Scissors,
  escalate: Zap,
};

function deriveActions(task: Task, prediction: PredictionResult): UrgentAction[] {
  if (!prediction.predicted_delayed) return [];
  
  const factors = prediction.factors;
  const actions: UrgentAction[] = [];

  if (factors.workloadScore > 0.6) {
    actions.push({
      task,
      prediction,
      actionType: 'reassign',
      actionLabel: 'Reassign Task',
      actionDescription: `"${task.title}" — assignee is overloaded (${Math.round(factors.workloadScore * 100)}% capacity)`,
      icon: actionIcons.reassign,
      urgency: prediction.confidence_score + factors.workloadScore,
    });
  }

  if (factors.dueDateGapScore > 0.7 && factors.slaRiskScore > 0.5) {
    actions.push({
      task,
      prediction,
      actionType: 'extend_deadline',
      actionLabel: 'Extend Deadline',
      actionDescription: `"${task.title}" — SLA at risk with tight deadline`,
      icon: actionIcons.extend_deadline,
      urgency: prediction.confidence_score + factors.slaRiskScore,
    });
  }

  if (factors.workloadScore > 0.5 && factors.slaRiskScore > 0.4) {
    actions.push({
      task,
      prediction,
      actionType: 'split_work',
      actionLabel: 'Split Into Subtasks',
      actionDescription: `"${task.title}" — complex work under time pressure`,
      icon: actionIcons.split_work,
      urgency: prediction.confidence_score * 0.9,
    });
  }

  if (prediction.confidence_score >= 0.8 && factors.priorityScore > 0.5) {
    actions.push({
      task,
      prediction,
      actionType: 'escalate',
      actionLabel: 'Escalate Priority',
      actionDescription: `"${task.title}" — critical delay risk at ${Math.round(prediction.confidence_score * 100)}%`,
      icon: actionIcons.escalate,
      urgency: prediction.confidence_score + factors.priorityScore,
    });
  }

  return actions;
}

export function UrgentActionsPanel({ tasks, getPrediction }: UrgentActionsPanelProps) {
  // Collect all actions from all at-risk tasks
  const allActions: UrgentAction[] = [];
  
  tasks.forEach(task => {
    if (task.status === 'completed') return;
    const prediction = getPrediction(task);
    if (prediction) {
      allActions.push(...deriveActions(task, prediction));
    }
  });

  // Sort by urgency and take top 3
  const topActions = allActions
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Urgent Actions
          <Badge variant="secondary" className="ml-auto text-xs">
            Top 3
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topActions.map((action, i) => {
          const Icon = action.icon;
          const riskColor = getRiskLevelColor(action.prediction.risk_level);
          
          return (
            <div
              key={`${action.task.id}-${action.actionType}-${i}`}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm">{action.actionLabel}</p>
                  <Badge variant="outline" className={cn('text-xs', riskColor)}>
                    {Math.round(action.prediction.confidence_score * 100)}% risk
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {action.actionDescription}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          );
        })}

        {topActions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No urgent actions needed</p>
            <p className="text-xs">All tasks are progressing well</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
