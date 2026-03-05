import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTasks } from './useTasks';
import { predictTaskDelay } from '@/services/delayPrediction';
import { predictWithML } from '@/services/mlPrediction';
import { DelayPrediction, PredictionResult, PredictionFactors } from '@/types/prediction';
import { TenantModelWeights } from '@/types/federated';
import { Task, TaskPriority } from '@/types';
import { Json } from '@/integrations/supabase/types';

interface HistoricalStats {
  assigneeCompletionRates: Record<string, number>;
  tenantAvgCompletionTime: number;
}

export function useDelayPrediction() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tasks } = useTasks();

  // Fetch tenant's trained model
  const { data: tenantModel } = useQuery({
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

  // Fetch existing predictions
  const { data: predictions = [], isLoading: predictionsLoading } = useQuery({
    queryKey: ['delay-predictions', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('task_delay_predictions')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('predicted_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as DelayPrediction[];
    },
    enabled: !!profile?.tenant_id
  });

  // Calculate historical stats from completed tasks
  const historicalStats: HistoricalStats = (() => {
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at);
    
    // Calculate per-assignee completion rates
    const assigneeStats: Record<string, { total: number; onTime: number }> = {};
    
    completedTasks.forEach(task => {
      if (!task.assignee_id) return;
      
      if (!assigneeStats[task.assignee_id]) {
        assigneeStats[task.assignee_id] = { total: 0, onTime: 0 };
      }
      
      assigneeStats[task.assignee_id].total++;
      
      // Check if completed on time
      if (task.due_date && task.completed_at) {
        const dueDate = new Date(task.due_date);
        const completedAt = new Date(task.completed_at);
        if (completedAt <= dueDate) {
          assigneeStats[task.assignee_id].onTime++;
        }
      } else {
        // No due date = consider on time
        assigneeStats[task.assignee_id].onTime++;
      }
    });
    
    const assigneeCompletionRates: Record<string, number> = {};
    Object.entries(assigneeStats).forEach(([id, stats]) => {
      assigneeCompletionRates[id] = stats.total > 0 ? stats.onTime / stats.total : 0.5;
    });
    
    // Calculate tenant average completion time (in hours)
    let totalHours = 0;
    let countWithTimes = 0;
    
    completedTasks.forEach(task => {
      if (task.started_at && task.completed_at) {
        const start = new Date(task.started_at);
        const end = new Date(task.completed_at);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 720) { // Exclude outliers > 30 days
          totalHours += hours;
          countWithTimes++;
        }
      }
    });
    
    const tenantAvgCompletionTime = countWithTimes > 0 ? totalHours / countWithTimes : 24;
    
    return { assigneeCompletionRates, tenantAvgCompletionTime };
  })();

  // Calculate workload for a specific assignee
  const getAssigneeWorkload = (assigneeId: string | null): number => {
    if (!assigneeId) return 0;
    return tasks.filter(t => 
      t.assignee_id === assigneeId && 
      t.status !== 'completed'
    ).length;
  };

  // Generate prediction for a task (uses ML model if available)
  const generatePrediction = (
    task: Partial<Task> & { priority: TaskPriority; due_date?: string | null; sla_hours?: number | null },
    assigneeId: string | null
  ): PredictionResult => {
    const assigneeWorkload = getAssigneeWorkload(assigneeId);
    const assigneeCompletionRate = assigneeId 
      ? (historicalStats.assigneeCompletionRates[assigneeId] ?? 0.5)
      : 0.5;
    
    // Use ML-enhanced prediction if model is available
    if (tenantModel && tenantModel.weights) {
      return predictWithML(
        task,
        assigneeWorkload,
        assigneeCompletionRate,
        tenantModel
      );
    }
    
    // Fall back to rule-based prediction
    return predictTaskDelay({
      task,
      assigneeWorkload,
      assigneeCompletionRate,
      tenantAvgCompletionTime: historicalStats.tenantAvgCompletionTime
    });
  };

  // Save prediction to database
  const savePrediction = useMutation({
    mutationFn: async ({
      taskId,
      prediction,
      trigger
    }: {
      taskId: string;
      prediction: PredictionResult;
      trigger: 'creation' | 'in_progress';
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      // First try to find existing prediction
      const { data: existing } = await supabase
        .from('task_delay_predictions')
        .select('id')
        .eq('task_id', taskId)
        .eq('prediction_trigger', trigger)
        .single();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('task_delay_predictions')
          .update({
            predicted_delayed: prediction.predicted_delayed,
            confidence_score: prediction.confidence_score,
            prediction_factors: prediction.factors as unknown as Json,
            predicted_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('task_delay_predictions')
          .insert([{
            task_id: taskId,
            tenant_id: profile.tenant_id,
            predicted_delayed: prediction.predicted_delayed,
            confidence_score: prediction.confidence_score,
            prediction_factors: prediction.factors as unknown as Json,
            prediction_trigger: trigger,
            predicted_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delay-predictions'] });
    }
  });

  // Get prediction for a specific task
  const getTaskPrediction = (taskId: string): DelayPrediction | undefined => {
    return predictions.find(p => p.task_id === taskId);
  };

  // Get all high-risk tasks
  const highRiskTasks = predictions.filter(p => 
    p.predicted_delayed && p.confidence_score >= 0.6
  );

  // Get tasks at risk of delay
  const tasksAtRisk = tasks.filter(task => {
    if (task.status === 'completed') return false;
    const prediction = getTaskPrediction(task.id);
    return prediction?.predicted_delayed;
  });

  return {
    predictions,
    predictionsLoading,
    generatePrediction,
    savePrediction,
    getTaskPrediction,
    highRiskTasks,
    tasksAtRisk,
    historicalStats,
    tenantModel,
    hasMLModel: !!tenantModel?.weights
  };
}
