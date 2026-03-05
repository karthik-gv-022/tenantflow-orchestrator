/**
 * Feature Extraction for Task Delay Prediction
 * Extracts features from task data for ML model training
 */

import { Task, TaskPriority } from '@/types';
import { TrainingExample, TrainingDataset, TrainingFeatures } from '@/types/federated';

// Feature names for model interpretation
export const FEATURE_NAMES = [
  'priority_encoded',
  'due_date_gap_hours',
  'sla_hours_normalized',
  'assignee_workload',
  'historical_completion_rate',
  'task_complexity',
  'is_high_priority',
  'has_sla'
];

// Priority encoding
const PRIORITY_ENCODING: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

/**
 * Calculate hours until due date from a reference time
 */
function calculateDueDateGap(dueDate: string | null, referenceTime: Date = new Date()): number {
  if (!dueDate) return 168; // Default to 1 week if no due date
  
  const due = new Date(dueDate);
  const gap = (due.getTime() - referenceTime.getTime()) / (1000 * 60 * 60);
  
  return Math.max(-168, Math.min(720, gap)); // Clamp to -1 week to +30 days
}

/**
 * Calculate task complexity based on available data
 */
function calculateTaskComplexity(task: Task): number {
  let complexity = 0.5; // Default moderate complexity
  
  // Description length contributes to complexity
  if (task.description) {
    const descLength = task.description.length;
    if (descLength > 500) complexity += 0.2;
    else if (descLength > 200) complexity += 0.1;
  }
  
  // Priority affects perceived complexity
  if (task.priority === 'critical') complexity += 0.2;
  else if (task.priority === 'high') complexity += 0.1;
  
  return Math.min(1, complexity);
}

/**
 * Extract features from a single task
 */
export function extractTaskFeatures(
  task: Task,
  assigneeWorkload: number,
  historicalCompletionRate: number,
  referenceTime: Date = new Date()
): TrainingFeatures {
  const dueDateGap = calculateDueDateGap(task.due_date, referenceTime);
  
  return {
    priority_encoded: PRIORITY_ENCODING[task.priority] / 3, // Normalize to 0-1
    due_date_gap_hours: dueDateGap / 720, // Normalize to ~0-1 range
    sla_hours: (task.sla_hours || 24) / 168, // Normalize to week
    assignee_workload: Math.min(assigneeWorkload / 10, 1), // Cap at 10 tasks
    historical_completion_rate: historicalCompletionRate,
    task_complexity: calculateTaskComplexity(task)
  };
}

/**
 * Convert features to array for model input
 */
export function featuresToArray(features: TrainingFeatures): number[] {
  return [
    features.priority_encoded,
    features.due_date_gap_hours,
    features.sla_hours,
    features.assignee_workload,
    features.historical_completion_rate,
    features.task_complexity,
    features.priority_encoded > 0.5 ? 1 : 0, // is_high_priority
    features.sla_hours > 0 ? 1 : 0 // has_sla
  ];
}

/**
 * Determine if a task was delayed (ground truth for training)
 */
export function wasTaskDelayed(task: Task): boolean | null {
  // Can only determine delay for completed tasks with due dates
  if (task.status !== 'completed' || !task.completed_at) {
    return null;
  }
  
  if (!task.due_date) {
    return false; // No due date = not delayed
  }
  
  const completedAt = new Date(task.completed_at);
  const dueDate = new Date(task.due_date);
  
  return completedAt > dueDate;
}

/**
 * Generate training dataset from completed tasks
 */
export function generateTrainingDataset(
  tasks: Task[],
  assigneeWorkloads: Record<string, number>,
  historicalCompletionRates: Record<string, number>
): TrainingDataset {
  const examples: TrainingExample[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  for (const task of tasks) {
    // Only use completed tasks with ground truth
    const delayed = wasTaskDelayed(task);
    if (delayed === null) continue;

    // Get workload and rate at task creation time (approximation)
    const assigneeWorkload = task.assignee_id 
      ? (assigneeWorkloads[task.assignee_id] || 3)
      : 0;
    const completionRate = task.assignee_id 
      ? (historicalCompletionRates[task.assignee_id] || 0.5)
      : 0.5;

    // Use task creation time as reference for features
    const referenceTime = new Date(task.created_at);
    
    const features = extractTaskFeatures(
      task,
      assigneeWorkload,
      completionRate,
      referenceTime
    );

    const featureArray = featuresToArray(features);
    const label: 0 | 1 = delayed ? 1 : 0;

    examples.push({ features: featureArray, label });

    if (delayed) positiveCount++;
    else negativeCount++;
  }

  return {
    examples,
    feature_names: FEATURE_NAMES,
    positive_count: positiveCount,
    negative_count: negativeCount
  };
}

/**
 * Balance dataset using oversampling of minority class
 */
export function balanceDataset(dataset: TrainingDataset): TrainingDataset {
  const { examples, positive_count, negative_count } = dataset;
  
  if (positive_count === 0 || negative_count === 0) {
    return dataset; // Can't balance if one class is missing
  }

  const positiveExamples = examples.filter(e => e.label === 1);
  const negativeExamples = examples.filter(e => e.label === 0);

  // Oversample minority class
  const balancedExamples: TrainingExample[] = [];
  
  if (positive_count < negative_count) {
    // Oversample positives
    balancedExamples.push(...negativeExamples);
    while (balancedExamples.filter(e => e.label === 1).length < negative_count) {
      const randomPositive = positiveExamples[Math.floor(Math.random() * positiveExamples.length)];
      balancedExamples.push({ ...randomPositive });
    }
  } else {
    // Oversample negatives
    balancedExamples.push(...positiveExamples);
    while (balancedExamples.filter(e => e.label === 0).length < positive_count) {
      const randomNegative = negativeExamples[Math.floor(Math.random() * negativeExamples.length)];
      balancedExamples.push({ ...randomNegative });
    }
  }

  return {
    examples: balancedExamples,
    feature_names: dataset.feature_names,
    positive_count: balancedExamples.filter(e => e.label === 1).length,
    negative_count: balancedExamples.filter(e => e.label === 0).length
  };
}
