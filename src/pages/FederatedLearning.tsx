import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FederatedLearningDashboard } from '@/components/federated/FederatedLearningDashboard';
import { ModelComparisonChart } from '@/components/federated/ModelComparisonChart';

export default function FederatedLearning() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FederatedLearningDashboard />
        <ModelComparisonChart />
      </div>
    </DashboardLayout>
  );
}
