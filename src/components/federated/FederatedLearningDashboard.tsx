import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFederatedLearning } from '@/hooks/useFederatedLearning';
import { 
  Brain, 
  Network, 
  Play, 
  RefreshCw, 
  Shield, 
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function FederatedLearningDashboard() {
  const {
    tenantModel,
    modelLoading,
    trainingRounds,
    latestCompletedRound,
    trainLocalModel,
    startFederatedRound,
    isTraining
  } = useFederatedLearning();

  const formatAccuracy = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${Math.round(value * 100)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-status-completed/20 text-status-completed"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'training':
        return <Badge className="bg-status-in-progress/20 text-status-in-progress"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Training</Badge>;
      case 'aggregating':
        return <Badge className="bg-status-review/20 text-status-review"><RefreshCw className="w-3 h-3 mr-1" /> Aggregating</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            Federated Intelligence
          </h2>
          <p className="text-muted-foreground">
            Privacy-preserving machine learning across tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => trainLocalModel.mutate()}
            disabled={isTraining}
          >
            {trainLocalModel.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Train Local Model
          </Button>
          <Button
            onClick={() => startFederatedRound.mutate()}
            disabled={isTraining}
          >
            {startFederatedRound.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Start Federated Round
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Local Model</p>
                <p className="text-2xl font-bold">
                  {modelLoading ? '...' : tenantModel ? `v${tenantModel.model_version}` : 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-completed/10">
                <TrendingUp className="w-6 h-6 text-status-completed" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Model Accuracy</p>
                <p className="text-2xl font-bold">
                  {formatAccuracy(tenantModel?.accuracy ?? null)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-in-progress/10">
                <Network className="w-6 h-6 text-status-in-progress" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Rounds</p>
                <p className="text-2xl font-bold">
                  {trainingRounds.filter(r => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-review/10">
                <Shield className="w-6 h-6 text-status-review" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Privacy Mode</p>
                <p className="text-2xl font-bold">Federated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Local Model Details */}
      {tenantModel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Local Model Performance</CardTitle>
            <CardDescription>
              Trained on {tenantModel.training_samples} samples from your tenant's data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Accuracy</p>
                <Progress value={(tenantModel.accuracy || 0) * 100} className="h-2" />
                <p className="text-sm mt-1">{formatAccuracy(tenantModel.accuracy)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Precision</p>
                <Progress value={(tenantModel.precision_score || 0) * 100} className="h-2" />
                <p className="text-sm mt-1">{formatAccuracy(tenantModel.precision_score)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Recall</p>
                <Progress value={(tenantModel.recall_score || 0) * 100} className="h-2" />
                <p className="text-sm mt-1">{formatAccuracy(tenantModel.recall_score)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">F1 Score</p>
                <Progress value={(tenantModel.f1_score || 0) * 100} className="h-2" />
                <p className="text-sm mt-1">{formatAccuracy(tenantModel.f1_score)}</p>
              </div>
            </div>
            
            {tenantModel.last_trained_at && (
              <p className="text-xs text-muted-foreground mt-4">
                Last trained: {format(new Date(tenantModel.last_trained_at), 'PPp')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Federated Training History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Federated Training Rounds</CardTitle>
          <CardDescription>
            Cross-tenant model optimization with privacy preservation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainingRounds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No training rounds yet</p>
              <p className="text-sm">Start a federated round to improve model accuracy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainingRounds.slice(0, 5).map((round) => (
                <div
                  key={round.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    round.status === 'completed' && 'bg-status-completed/5',
                    round.status === 'failed' && 'bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">#{round.round_number}</p>
                      <p className="text-xs text-muted-foreground">Round</p>
                    </div>
                    <div>
                      {getStatusBadge(round.status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        {round.participating_tenants.length} tenant(s) • {round.total_samples} samples
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {round.global_accuracy !== null && (
                      <p className="font-medium">
                        {formatAccuracy(round.global_accuracy)} accuracy
                      </p>
                    )}
                    {round.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(round.completed_at), 'PP')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Privacy-Preserving Architecture</h3>
              <p className="text-sm text-muted-foreground">
                Your raw task data never leaves your tenant's boundary. Only model weights and 
                aggregated training statistics are shared during federated learning rounds. 
                This enables cross-tenant intelligence while maintaining strict data isolation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
