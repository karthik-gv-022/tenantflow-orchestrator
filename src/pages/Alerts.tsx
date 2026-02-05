import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { useTasks } from '@/hooks/useTasks';
import { Loader2 } from 'lucide-react';

export default function Alerts() {
  const { tasks, overdueTasks, isLoading } = useTasks();

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

        <AlertsPanel overdueTasks={overdueTasks} tasks={tasks} />
      </div>
    </DashboardLayout>
  );
}
