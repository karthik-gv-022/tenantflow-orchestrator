import { Task, TaskPriority } from '@/types';
import { PredictionFactors, PredictionResult, DelayRiskLevel } from '@/types/prediction';

// Priority weights for delay prediction
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.6,
  critical: 0.9
};

interface PredictionContext {
  task: Partial<Task> & { priority: TaskPriority; due_date?: string | null; sla_hours?: number | null };
  assigneeWorkload: number; // Number of active tasks assigned to user
  assigneeCompletionRate: number; // 0-1, percentage of on-time completions
  tenantAvgCompletionTime: number; // Average hours to complete tasks in tenant
}

/**
 * Calculate the due date gap score based on time remaining
 * Lower gap = higher risk
 */
function calculateDueDateGapScore(dueDate: string | null | undefined): number {
  if (!dueDate) return 0.3; // No due date = moderate risk
  
  const now = new Date();
  const due = new Date(dueDate);
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) return 1.0; // Already overdue
  if (hoursRemaining < 4) return 0.9; // Less than 4 hours
  if (hoursRemaining < 24) return 0.7; // Less than 1 day
  if (hoursRemaining < 48) return 0.5; // Less than 2 days
  if (hoursRemaining < 72) return 0.3; // Less than 3 days
  if (hoursRemaining < 168) return 0.2; // Less than 1 week
  return 0.1; // More than 1 week
}

/**
 * Calculate workload score based on assignee's current task count
 * Higher workload = higher risk
 */
function calculateWorkloadScore(activeTaskCount: number): number {
  if (activeTaskCount === 0) return 0.1;
  if (activeTaskCount <= 2) return 0.2;
  if (activeTaskCount <= 4) return 0.4;
  if (activeTaskCount <= 6) return 0.6;
  if (activeTaskCount <= 8) return 0.8;
  return 0.95; // Overloaded
}

/**
 * Calculate SLA risk based on SLA hours vs due date gap
 */
function calculateSlaRiskScore(
  slaHours: number | null | undefined,
  dueDate: string | null | undefined,
  avgCompletionTime: number
): number {
  if (!dueDate) return 0.3;
  
  const now = new Date();
  const due = new Date(dueDate);
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Use SLA hours if available, otherwise use tenant average
  const estimatedHours = slaHours || avgCompletionTime || 8;
  
  if (hoursRemaining <= 0) return 1.0;
  
  const ratio = estimatedHours / hoursRemaining;
  
  if (ratio > 1.5) return 0.95; // Needs 150%+ of available time
  if (ratio > 1.0) return 0.8; // Needs more time than available
  if (ratio > 0.75) return 0.6; // Tight timeline
  if (ratio > 0.5) return 0.4; // Reasonable buffer
  return 0.2; // Comfortable buffer
}

/**
 * Calculate historical score based on assignee's past performance
 */
function calculateHistoricalScore(completionRate: number): number {
  if (completionRate >= 0.9) return 0.1; // Excellent track record
  if (completionRate >= 0.75) return 0.3;
  if (completionRate >= 0.5) return 0.5;
  if (completionRate >= 0.25) return 0.7;
  return 0.9; // Poor track record or new user
}

/**
 * Determine risk level based on confidence score
 */
function getRiskLevel(confidenceScore: number, predictedDelayed: boolean): DelayRiskLevel {
  if (!predictedDelayed) {
    if (confidenceScore > 0.3) return 'medium';
    return 'low';
  }
  
  if (confidenceScore >= 0.8) return 'critical';
  if (confidenceScore >= 0.6) return 'high';
  if (confidenceScore >= 0.4) return 'medium';
  return 'low';
}

/**
 * Generate recommendations based on prediction factors
 */
function generateRecommendations(factors: PredictionFactors, predictedDelayed: boolean): string[] {
  const recommendations: string[] = [];
  
  if (!predictedDelayed) return ['Task is on track for on-time completion'];
  
  if (factors.workloadScore > 0.6) {
    recommendations.push('Consider reassigning to reduce workload imbalance');
  }
  
  if (factors.dueDateGapScore > 0.7) {
    recommendations.push('Deadline is approaching - prioritize this task');
  }
  
  if (factors.slaRiskScore > 0.7) {
    recommendations.push('SLA timeline is at risk - consider extending deadline');
  }
  
  if (factors.historicalScore > 0.6) {
    recommendations.push('Assignee may benefit from additional support');
  }
  
  if (factors.priorityScore > 0.7) {
    recommendations.push('High priority task requires immediate attention');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Monitor task progress closely');
  }
  
  return recommendations;
}

/**
 * Main prediction function - calculates delay probability for a task
 * Uses a weighted scoring model based on available features
 */
export function predictTaskDelay(context: PredictionContext): PredictionResult {
  const { task, assigneeWorkload, assigneeCompletionRate, tenantAvgCompletionTime } = context;
  
  // Calculate individual factor scores
  const factors: PredictionFactors = {
    priorityScore: PRIORITY_WEIGHTS[task.priority],
    dueDateGapScore: calculateDueDateGapScore(task.due_date),
    workloadScore: calculateWorkloadScore(assigneeWorkload),
    slaRiskScore: calculateSlaRiskScore(task.sla_hours, task.due_date, tenantAvgCompletionTime),
    historicalScore: calculateHistoricalScore(assigneeCompletionRate)
  };
  
  // Weighted average for final confidence score
  // Weights reflect importance of each factor
  const weights = {
    priority: 0.15,
    dueDate: 0.25,
    workload: 0.20,
    sla: 0.25,
    historical: 0.15
  };
  
  const confidenceScore = Math.min(1, Math.max(0,
    factors.priorityScore * weights.priority +
    factors.dueDateGapScore * weights.dueDate +
    factors.workloadScore * weights.workload +
    factors.slaRiskScore * weights.sla +
    factors.historicalScore * weights.historical
  ));
  
  // Threshold for delay prediction
  const DELAY_THRESHOLD = 0.5;
  const predictedDelayed = confidenceScore >= DELAY_THRESHOLD;
  
  const riskLevel = getRiskLevel(confidenceScore, predictedDelayed);
  const recommendations = generateRecommendations(factors, predictedDelayed);
  
  return {
    predicted_delayed: predictedDelayed,
    confidence_score: Math.round(confidenceScore * 100) / 100,
    risk_level: riskLevel,
    factors,
    recommendations
  };
}

/**
 * Get color for risk level display
 */
export function getRiskLevelColor(riskLevel: DelayRiskLevel): string {
  switch (riskLevel) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-status-review';
    case 'medium': return 'text-yellow-600 dark:text-yellow-500';
    case 'low': return 'text-status-completed';
    default: return 'text-muted-foreground';
  }
}

export function getRiskLevelBgColor(riskLevel: DelayRiskLevel): string {
  switch (riskLevel) {
    case 'critical': return 'bg-destructive/10 border-destructive/30';
    case 'high': return 'bg-status-review/10 border-status-review/30';
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'low': return 'bg-status-completed/10 border-status-completed/30';
    default: return 'bg-muted';
  }
}
