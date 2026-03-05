import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types';
import { DelayPrediction, PredictionFactors } from '@/types/prediction';
import { AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRiskLevelBgColor } from '@/services/delayPrediction';

interface PredictionAlertsProps {
  tasksAtRisk: Task[];
  predictions: DelayPrediction[];
  getTaskPrediction: (taskId: string) => DelayPrediction | undefined;
}

export function PredictionAlerts({ tasksAtRisk, predictions, getTaskPrediction }: PredictionAlertsProps) {
  // Calculate aggregate stats
  const criticalRiskCount = predictions.filter(p => 
    p.predicted_delayed && p.confidence_score >= 0.8
  ).length;
  
  const highRiskCount = predictions.filter(p => 
    p.predicted_delayed && p.confidence_score >= 0.6 && p.confidence_score < 0.8
  ).length;
  
  // Identify workload imbalances from prediction factors
  const workloadIssues = predictions.filter(p => {
    const factors = p.prediction_factors as unknown as PredictionFactors;
    return factors?.workloadScore > 0.6;
  }).length;

  const alerts = [
    {
      type: 'critical',
      icon: AlertTriangle,
      title: 'Critical Delay Risk',
      count: criticalRiskCount,
      message: `${criticalRiskCount} task${criticalRiskCount !== 1 ? 's' : ''} highly likely to miss deadline`
    },
    {
      type: 'warning',
      icon: Clock,
      title: 'High Delay Risk',
      count: highRiskCount,
      message: `${highRiskCount} task${highRiskCount !== 1 ? 's' : ''} at significant risk of delay`
    },
    {
      type: 'info',
      icon: Users,
      title: 'Workload Imbalance',
      count: workloadIssues,
      message: `${workloadIssues} task${workloadIssues !== 1 ? 's' : ''} affected by assignee overload`
    }
  ].filter(a => a.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Predictive Alerts
          <Badge variant="secondary" className="ml-auto">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border',
              alert.type === 'critical' && 'bg-destructive/10 border-destructive/30',
              alert.type === 'warning' && 'bg-status-review/10 border-status-review/30',
              alert.type === 'info' && 'bg-primary/10 border-primary/30'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                alert.type === 'critical' && 'bg-destructive/20',
                alert.type === 'warning' && 'bg-status-review/20',
                alert.type === 'info' && 'bg-primary/20'
              )}
            >
              <alert.icon
                className={cn(
                  'w-5 h-5',
                  alert.type === 'critical' && 'text-destructive',
                  alert.type === 'warning' && 'text-status-review',
                  alert.type === 'info' && 'text-primary'
                )}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">{alert.title}</p>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
            </div>
            <span className="text-2xl font-bold">{alert.count}</span>
          </div>
        ))}
        
        {alerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No delay predictions at this time</p>
            <p className="text-sm">All tasks appear on track!</p>
          </div>
        )}
        
        {tasksAtRisk.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Tasks Requiring Attention</p>
            <div className="space-y-2">
              {tasksAtRisk.slice(0, 5).map(task => {
                const prediction = getTaskPrediction(task.id);
                const factors = prediction?.prediction_factors as unknown as PredictionFactors;
                const riskLevel = prediction && prediction.confidence_score >= 0.8 ? 'critical' : 
                                  prediction && prediction.confidence_score >= 0.6 ? 'high' : 'medium';
                
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'p-3 rounded-lg border text-sm',
                      getRiskLevelBgColor(riskLevel)
                    )}
                  >
                    <p className="font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        Risk: {Math.round((prediction?.confidence_score || 0) * 100)}%
                      </span>
                      {factors?.workloadScore > 0.6 && (
                        <Badge variant="outline" className="text-xs">Overloaded</Badge>
                      )}
                      {factors?.dueDateGapScore > 0.7 && (
                        <Badge variant="outline" className="text-xs">Urgent</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
