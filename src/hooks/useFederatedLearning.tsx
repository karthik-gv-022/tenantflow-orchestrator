import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { 
  TenantModelWeights, 
  FederatedTrainingRound, 
  ModelEvaluationResult,
  ModelWeights 
} from '@/types/federated';
import { toast } from 'sonner';

export function useFederatedLearning() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Fetch tenant's model weights
  const { data: tenantModel, isLoading: modelLoading } = useQuery({
    queryKey: ['tenant-model', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      
      const { data, error } = await supabase
        .from('tenant_model_weights')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('model_version', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as TenantModelWeights | null;
    },
    enabled: !!profile?.tenant_id
  });

  // Fetch training rounds
  const { data: trainingRounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: ['training-rounds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('federated_training_rounds')
        .select('*')
        .order('round_number', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as FederatedTrainingRound[];
    }
  });

  // Fetch evaluation results
  const { data: evaluationResults = [] } = useQuery({
    queryKey: ['evaluation-results', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_evaluation_results')
        .select('*')
        .order('evaluated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as unknown as ModelEvaluationResult[];
    },
    enabled: !!profile?.tenant_id
  });

  // Trigger local model training
  const trainLocalModel = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/train-local-model`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ tenant_id: profile.tenant_id })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Training failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-model'] });
      toast.success(`Model trained successfully! Accuracy: ${Math.round((data.metrics?.accuracy || 0) * 100)}%`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Start federated training round
  const startFederatedRound = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/federated-coordinator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ action: 'start_round' })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to start round');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Auto-aggregate after training
      if (data.round_id) {
        await aggregateRound.mutateAsync(data.round_id);
      }
      queryClient.invalidateQueries({ queryKey: ['training-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-model'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Aggregate federated round
  const aggregateRound = useMutation({
    mutationFn: async (roundId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/federated-coordinator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ action: 'aggregate', round_id: roundId })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Aggregation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-model'] });
      toast.success(`Federated round completed! Global accuracy: ${Math.round((data.average_accuracy || 0) * 100)}%`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Latest completed round
  const latestCompletedRound = trainingRounds.find(r => r.status === 'completed');

  // Compare federated vs local performance
  const federatedResults = evaluationResults.filter(e => e.evaluation_type === 'federated');
  const localResults = evaluationResults.filter(e => e.evaluation_type === 'local');

  return {
    tenantModel,
    modelLoading,
    trainingRounds,
    roundsLoading,
    evaluationResults,
    latestCompletedRound,
    federatedResults,
    localResults,
    trainLocalModel,
    startFederatedRound,
    aggregateRound,
    isTraining: trainLocalModel.isPending || startFederatedRound.isPending,
  };
}
