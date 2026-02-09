import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Priority encoding
const PRIORITY_ENCODING: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

// Feature names
const FEATURE_NAMES = [
  'priority_encoded',
  'due_date_gap_hours',
  'sla_hours_normalized',
  'assignee_workload',
  'historical_completion_rate',
  'task_complexity',
  'is_high_priority',
  'has_sla'
];

// Sigmoid function
function sigmoid(x: number): number {
  const clipped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clipped));
}

// Binary cross-entropy loss
function binaryCrossEntropy(predicted: number, actual: number): number {
  const epsilon = 1e-15;
  const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

// Predict using logistic regression
function predict(features: number[], weights: { coefficients: number[]; intercept: number }): number {
  let sum = weights.intercept;
  for (let i = 0; i < features.length && i < weights.coefficients.length; i++) {
    sum += features[i] * weights.coefficients[i];
  }
  return sigmoid(sum);
}

// Initialize weights
function initializeWeights(numFeatures: number) {
  return {
    coefficients: Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.1),
    intercept: 0
  };
}

// Train logistic regression
function trainModel(examples: { features: number[]; label: number }[], options: {
  learningRate?: number;
  epochs?: number;
  regularization?: number;
}) {
  const { learningRate = 0.01, epochs = 100, regularization = 0.01 } = options;
  
  if (examples.length === 0) {
    return { weights: initializeWeights(FEATURE_NAMES.length), metrics: null };
  }

  const numFeatures = examples[0].features.length;
  let weights = initializeWeights(numFeatures);
  
  // Shuffle and split
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  const splitIdx = Math.floor(shuffled.length * 0.8);
  const trainSet = shuffled.slice(0, splitIdx);
  const validSet = shuffled.slice(splitIdx);

  let bestWeights = { ...weights, coefficients: [...weights.coefficients] };
  let bestLoss = Infinity;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const ex of trainSet.sort(() => Math.random() - 0.5)) {
      const pred = predict(ex.features, weights);
      const error = pred - ex.label;

      for (let i = 0; i < numFeatures; i++) {
        weights.coefficients[i] -= learningRate * (error * ex.features[i] + regularization * weights.coefficients[i]);
      }
      weights.intercept -= learningRate * error;
    }

    // Validate
    if (validSet.length > 0 && epoch % 20 === 0) {
      let loss = 0;
      for (const ex of validSet) {
        loss += binaryCrossEntropy(predict(ex.features, weights), ex.label);
      }
      loss /= validSet.length;
      if (loss < bestLoss) {
        bestLoss = loss;
        bestWeights = { coefficients: [...weights.coefficients], intercept: weights.intercept };
      }
    }
  }

  // Evaluate on validation set
  let tp = 0, tn = 0, fp = 0, fn = 0;
  const evalSet = validSet.length > 0 ? validSet : trainSet;
  for (const ex of evalSet) {
    const pred = predict(ex.features, bestWeights) >= 0.5 ? 1 : 0;
    if (pred === 1 && ex.label === 1) tp++;
    else if (pred === 0 && ex.label === 0) tn++;
    else if (pred === 1 && ex.label === 0) fp++;
    else fn++;
  }

  const accuracy = (tp + tn) / evalSet.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  return {
    weights: bestWeights,
    metrics: { accuracy, precision, recall, f1, loss: bestLoss }
  };
}

// Extract features from a task
function extractFeatures(task: any, workload: number, completionRate: number): number[] {
  const priorityEncoded = (PRIORITY_ENCODING[task.priority] || 1) / 3;
  
  let dueDateGap = 0.5;
  if (task.due_date) {
    const gap = (new Date(task.due_date).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
    dueDateGap = Math.max(-1, Math.min(1, gap / 720));
  }

  const slaHours = ((task.sla_hours || 24) / 168);
  const normalizedWorkload = Math.min(workload / 10, 1);
  
  let complexity = 0.5;
  if (task.description && task.description.length > 500) complexity = 0.8;
  else if (task.description && task.description.length > 200) complexity = 0.6;

  return [
    priorityEncoded,
    dueDateGap,
    slaHours,
    normalizedWorkload,
    completionRate,
    complexity,
    priorityEncoded > 0.5 ? 1 : 0,
    task.sla_hours ? 1 : 0
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { tenant_id, round_id } = await req.json();

    if (!tenant_id) {
      throw new Error("tenant_id is required");
    }

    const startTime = Date.now();

    // Fetch completed tasks for this tenant
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("status", "completed")
      .not("completed_at", "is", null);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient training data", 
          message: "Need at least 10 completed tasks for training",
          task_count: tasks?.length || 0
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate assignee workloads and completion rates
    const assigneeStats: Record<string, { total: number; onTime: number; activeCount: number }> = {};
    
    for (const task of tasks) {
      if (!task.assignee_id) continue;
      
      if (!assigneeStats[task.assignee_id]) {
        assigneeStats[task.assignee_id] = { total: 0, onTime: 0, activeCount: 3 };
      }
      
      assigneeStats[task.assignee_id].total++;
      
      if (task.due_date && task.completed_at) {
        if (new Date(task.completed_at) <= new Date(task.due_date)) {
          assigneeStats[task.assignee_id].onTime++;
        }
      } else {
        assigneeStats[task.assignee_id].onTime++;
      }
    }

    // Generate training examples
    const examples: { features: number[]; label: number }[] = [];
    
    for (const task of tasks) {
      if (!task.due_date) continue;
      
      const wasDelayed = new Date(task.completed_at) > new Date(task.due_date);
      const workload = task.assignee_id ? (assigneeStats[task.assignee_id]?.activeCount || 3) : 0;
      const completionRate = task.assignee_id && assigneeStats[task.assignee_id]
        ? assigneeStats[task.assignee_id].onTime / assigneeStats[task.assignee_id].total
        : 0.5;

      const features = extractFeatures(task, workload, completionRate);
      examples.push({ features, label: wasDelayed ? 1 : 0 });
    }

    if (examples.length < 5) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient labeled data",
          message: "Need at least 5 tasks with due dates for training",
          example_count: examples.length
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Balance dataset
    const positives = examples.filter(e => e.label === 1);
    const negatives = examples.filter(e => e.label === 0);
    
    let balancedExamples = [...examples];
    if (positives.length > 0 && negatives.length > 0) {
      const minority = positives.length < negatives.length ? positives : negatives;
      const majority = positives.length < negatives.length ? negatives : positives;
      
      balancedExamples = [...majority];
      while (balancedExamples.filter(e => e.label === minority[0].label).length < majority.length) {
        const random = minority[Math.floor(Math.random() * minority.length)];
        balancedExamples.push({ ...random });
      }
    }

    // Train model
    const { weights, metrics } = trainModel(balancedExamples, {
      learningRate: 0.01,
      epochs: 100,
      regularization: 0.01
    });

    const trainingDuration = Date.now() - startTime;

    // Get current model version
    const { data: existingModel } = await supabase
      .from("tenant_model_weights")
      .select("model_version")
      .eq("tenant_id", tenant_id)
      .order("model_version", { ascending: false })
      .limit(1)
      .single();

    const newVersion = (existingModel?.model_version || 0) + 1;

    // Save model weights
    const { data: savedModel, error: saveError } = await supabase
      .from("tenant_model_weights")
      .insert({
        tenant_id,
        model_version: newVersion,
        weights,
        feature_names: FEATURE_NAMES,
        training_samples: balancedExamples.length,
        accuracy: metrics?.accuracy,
        precision_score: metrics?.precision,
        recall_score: metrics?.recall,
        f1_score: metrics?.f1,
        last_trained_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // If part of a federated round, save training metadata
    if (round_id) {
      await supabase.from("tenant_training_metadata").insert({
        tenant_id,
        round_id,
        local_weights: weights,
        training_samples: balancedExamples.length,
        validation_samples: Math.floor(balancedExamples.length * 0.2),
        training_accuracy: metrics?.accuracy,
        validation_accuracy: metrics?.accuracy,
        loss: metrics?.loss,
        epochs_completed: 100,
        training_duration_ms: trainingDuration
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        model_version: newVersion,
        training_samples: balancedExamples.length,
        metrics,
        training_duration_ms: trainingDuration,
        feature_names: FEATURE_NAMES
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Training error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
