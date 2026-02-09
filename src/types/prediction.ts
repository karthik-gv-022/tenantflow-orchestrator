export interface PredictionFactors {
  priorityScore: number;
  dueDateGapScore: number;
  workloadScore: number;
  slaRiskScore: number;
  historicalScore: number;
}

export interface DelayPrediction {
  id: string;
  task_id: string;
  tenant_id: string;
  predicted_delayed: boolean;
  confidence_score: number;
  prediction_factors: PredictionFactors;
  predicted_at: string;
  prediction_trigger: 'creation' | 'in_progress';
  created_at: string;
}

export type DelayRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PredictionResult {
  predicted_delayed: boolean;
  confidence_score: number;
  risk_level: DelayRiskLevel;
  factors: PredictionFactors;
  recommendations: string[];
}
