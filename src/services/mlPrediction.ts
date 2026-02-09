/**
 * ML-Enhanced Prediction Service
 * Uses trained logistic regression model when available, falls back to rule-based
 */

import { Task, TaskPriority } from '@/types';
import { PredictionResult, DelayRiskLevel } from '@/types/prediction';
import { ModelWeights, TenantModelWeights } from '@/types/federated';
import { predictTaskDelay, getRiskLevelColor, getRiskLevelBgColor } from './delayPrediction';

// Feature extraction matching training features
function extractPredictionFeatures(
  task: Partial<Task> & { priority: TaskPriority },
  assigneeWorkload: number,
  historicalCompletionRate: number
): number[] {
  const PRIORITY_ENCODING: Record<TaskPriority, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
  };

  const priorityEncoded = PRIORITY_ENCODING[task.priority] / 3;
  
  let dueDateGap = 0.5;
  if (task.due_date) {
    const gap = (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60);
    dueDateGap = Math.max(-1, Math.min(1, gap / 720));
  }

  const slaHours = ((task.sla_hours || 24) / 168);
  const normalizedWorkload = Math.min(assigneeWorkload / 10, 1);
  
  let complexity = 0.5;
  if (task.description && task.description.length > 500) complexity = 0.8;
  else if (task.description && task.description.length > 200) complexity = 0.6;

  return [
    priorityEncoded,
    dueDateGap,
    slaHours,
    normalizedWorkload,
    historicalCompletionRate,
    complexity,
    priorityEncoded > 0.5 ? 1 : 0,
    slaHours > 0 ? 1 : 0
  ];
}

// Sigmoid function
function sigmoid(x: number): number {
  const clipped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clipped));
}

// Predict using trained model
function predictWithModel(
  features: number[],
  weights: ModelWeights
): number {
  let sum = weights.intercept;
  for (let i = 0; i < features.length && i < weights.coefficients.length; i++) {
    sum += features[i] * weights.coefficients[i];
  }
  return sigmoid(sum);
}

// Get risk level from probability
function getRiskLevelFromProbability(probability: number, threshold = 0.5): DelayRiskLevel {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.6) return 'high';
  if (probability >= threshold) return 'medium';
  return 'low';
}

// Generate recommendations based on features and prediction
function generateMLRecommendations(
  features: number[],
  probability: number,
  predicted: boolean
): string[] {
  const recommendations: string[] = [];
  
  if (!predicted) {
    return ['Task is predicted to complete on time'];
  }

  // Feature indices: [priority, dueGap, sla, workload, histRate, complexity, isHigh, hasSla]
  const [priority, dueGap, sla, workload, histRate, complexity] = features;

  if (workload > 0.6) {
    recommendations.push('Assignee has high workload - consider reassignment');
  }

  if (dueGap < 0.1) {
    recommendations.push('Very tight deadline - prioritize immediately');
  }

  if (sla > 0.5 && dueGap < 0.3) {
    recommendations.push('SLA duration exceeds available time');
  }

  if (histRate < 0.5) {
    recommendations.push('Assignee has low on-time completion rate');
  }

  if (priority > 0.5 && probability > 0.7) {
    recommendations.push('High priority task at significant risk');
  }

  if (recommendations.length === 0) {
    recommendations.push('Monitor task progress closely');
  }

  return recommendations;
}

/**
 * ML-Enhanced Prediction
 * Uses trained model if available, otherwise falls back to rule-based
 */
export function predictWithML(
  task: Partial<Task> & { priority: TaskPriority; due_date?: string | null; sla_hours?: number | null },
  assigneeWorkload: number,
  historicalCompletionRate: number,
  tenantModel: TenantModelWeights | null
): PredictionResult {
  // If no trained model, use rule-based prediction
  if (!tenantModel || !tenantModel.weights) {
    return predictTaskDelay({
      task,
      assigneeWorkload,
      assigneeCompletionRate: historicalCompletionRate,
      tenantAvgCompletionTime: 24
    });
  }

  // Extract features
  const features = extractPredictionFeatures(task, assigneeWorkload, historicalCompletionRate);
  
  // Get model weights
  const weights = tenantModel.weights as unknown as ModelWeights;
  
  // Predict probability
  const probability = predictWithModel(features, weights);
  const predicted = probability >= 0.5;
  const riskLevel = getRiskLevelFromProbability(probability);
  
  // Generate recommendations
  const recommendations = generateMLRecommendations(features, probability, predicted);

  return {
    predicted_delayed: predicted,
    confidence_score: Math.round(probability * 100) / 100,
    risk_level: riskLevel,
    factors: {
      priorityScore: features[0],
      dueDateGapScore: 1 - features[1], // Invert for display
      workloadScore: features[3],
      slaRiskScore: features[2],
      historicalScore: 1 - features[4] // Invert for display
    },
    recommendations
  };
}

export { getRiskLevelColor, getRiskLevelBgColor };
