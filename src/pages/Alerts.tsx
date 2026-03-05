import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PredictionAlerts } from '@/components/predictions/PredictionAlerts';
import { useTasks } from '@/hooks/useTasks';
import { useDelayPrediction } from '@/hooks/useDelayPrediction';
import { Loader2 } from 'lucide-react';

export default function Alerts() {
  const { tasks, overdueTasks, isLoading } = useTasks();
  const { predictions, tasksAtRisk, getTaskPrediction } = useDelayPrediction();

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Intelligent notifications and risk detection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PredictionAlerts 
            tasksAtRisk={tasksAtRisk} 
            predictions={predictions} 
            getTaskPrediction={getTaskPrediction} 
          />
          <AlertsPanel overdueTasks={overdueTasks} tasks={tasks} />
        </div>
      </div>
    </DashboardLayout>
  );
}
