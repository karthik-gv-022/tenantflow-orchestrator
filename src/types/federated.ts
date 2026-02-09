// Federated Learning Types for Multi-Tenant Task Delay Prediction

export interface ModelWeights {
  coefficients: number[];  // Logistic regression coefficients
  intercept: number;       // Bias term
}

export interface TenantModelWeights {
  id: string;
  tenant_id: string;
  model_version: number;
  weights: ModelWeights;
  feature_names: string[];
  training_samples: number;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  last_trained_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FederatedTrainingRound {
  id: string;
  round_number: number;
  global_weights: ModelWeights | null;
  participating_tenants: string[];
  aggregation_method: 'federated_averaging';
  total_samples: number;
  global_accuracy: number | null;
  status: 'pending' | 'training' | 'aggregating' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface TenantTrainingMetadata {
  id: string;
  tenant_id: string;
  round_id: string;
  local_weights: ModelWeights;
  training_samples: number;
  validation_samples: number;
  training_accuracy: number | null;
  validation_accuracy: number | null;
  loss: number | null;
  epochs_completed: number;
  training_duration_ms: number | null;
  created_at: string;
}

export interface ModelEvaluationResult {
  id: string;
  tenant_id: string | null;
  evaluation_type: 'federated' | 'centralized' | 'local';
  round_id: string | null;
  test_samples: number;
  accuracy: number;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  true_positives: number | null;
  true_negatives: number | null;
  false_positives: number | null;
  false_negatives: number | null;
  auc_roc: number | null;
  evaluated_at: string;
  metadata: Record<string, unknown>;
}

// Training data structures
export interface TrainingFeatures {
  priority_encoded: number;      // 0-3 for low/medium/high/critical
  due_date_gap_hours: number;    // Hours until deadline
  sla_hours: number;             // Estimated duration
  assignee_workload: number;     // Number of active tasks
  historical_completion_rate: number; // 0-1
  task_complexity: number;       // Derived from description length, etc.
}

export interface TrainingExample {
  features: number[];
  label: 0 | 1;  // 0 = Not Delayed, 1 = Delayed
}

export interface TrainingDataset {
  examples: TrainingExample[];
  feature_names: string[];
  positive_count: number;
  negative_count: number;
}

export interface TrainingResult {
  weights: ModelWeights;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    loss: number;
  };
  training_samples: number;
  validation_samples: number;
  epochs: number;
  duration_ms: number;
}

export interface FederatedAggregationResult {
  global_weights: ModelWeights;
  total_samples: number;
  participating_tenants: number;
}
