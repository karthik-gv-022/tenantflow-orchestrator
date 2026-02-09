/**
 * Logistic Regression Implementation for Federated Learning
 * Simple, explainable model suitable for binary classification
 */

import { ModelWeights, TrainingExample, TrainingResult } from '@/types/federated';

// Sigmoid activation function
function sigmoid(x: number): number {
  // Clip to prevent overflow
  const clipped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clipped));
}

// Binary cross-entropy loss
function binaryCrossEntropy(predicted: number, actual: number): number {
  const epsilon = 1e-15;
  const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

// Predict probability using logistic regression
export function predict(features: number[], weights: ModelWeights): number {
  const { coefficients, intercept } = weights;
  let linearCombination = intercept;
  
  for (let i = 0; i < features.length && i < coefficients.length; i++) {
    linearCombination += features[i] * coefficients[i];
  }
  
  return sigmoid(linearCombination);
}

// Predict class (0 or 1) with threshold
export function predictClass(features: number[], weights: ModelWeights, threshold = 0.5): 0 | 1 {
  return predict(features, weights) >= threshold ? 1 : 0;
}

// Initialize weights with small random values
function initializeWeights(numFeatures: number): ModelWeights {
  const coefficients = Array(numFeatures).fill(0).map(() => 
    (Math.random() - 0.5) * 0.1
  );
  return {
    coefficients,
    intercept: 0
  };
}

// Normalize features to 0-1 range
export function normalizeFeatures(features: number[]): number[] {
  return features.map(f => {
    if (f < 0) return 0;
    if (f > 1000) return 1; // Cap large values
    return f / 1000; // Simple normalization
  });
}

/**
 * Train logistic regression model using gradient descent
 */
export function trainLogisticRegression(
  examples: TrainingExample[],
  options: {
    learningRate?: number;
    epochs?: number;
    regularization?: number;
    validationSplit?: number;
  } = {}
): TrainingResult {
  const startTime = Date.now();
  const {
    learningRate = 0.01,
    epochs = 100,
    regularization = 0.01,
    validationSplit = 0.2
  } = options;

  if (examples.length === 0) {
    throw new Error('No training examples provided');
  }

  const numFeatures = examples[0].features.length;
  
  // Split into training and validation sets
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * (1 - validationSplit));
  const trainSet = shuffled.slice(0, splitIndex);
  const validSet = shuffled.slice(splitIndex);

  // Initialize weights
  let weights = initializeWeights(numFeatures);
  let bestWeights = { ...weights, coefficients: [...weights.coefficients] };
  let bestValidationLoss = Infinity;
  let finalLoss = 0;

  // Training loop
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Shuffle training set each epoch
    const epochData = [...trainSet].sort(() => Math.random() - 0.5);
    let epochLoss = 0;

    // Mini-batch gradient descent
    for (const example of epochData) {
      const predicted = predict(example.features, weights);
      const error = predicted - example.label;
      epochLoss += binaryCrossEntropy(predicted, example.label);

      // Update weights
      for (let i = 0; i < numFeatures; i++) {
        const gradient = error * example.features[i] + regularization * weights.coefficients[i];
        weights.coefficients[i] -= learningRate * gradient;
      }
      weights.intercept -= learningRate * error;
    }

    epochLoss /= trainSet.length;
    finalLoss = epochLoss;

    // Evaluate on validation set
    if (validSet.length > 0 && epoch % 10 === 0) {
      let validationLoss = 0;
      for (const example of validSet) {
        const predicted = predict(example.features, weights);
        validationLoss += binaryCrossEntropy(predicted, example.label);
      }
      validationLoss /= validSet.length;

      // Save best weights
      if (validationLoss < bestValidationLoss) {
        bestValidationLoss = validationLoss;
        bestWeights = {
          coefficients: [...weights.coefficients],
          intercept: weights.intercept
        };
      }
    }
  }

  // Use best weights from validation
  weights = bestWeights;

  // Calculate final metrics
  const metrics = evaluateModel(weights, validSet.length > 0 ? validSet : trainSet);

  return {
    weights,
    metrics: {
      ...metrics,
      loss: finalLoss
    },
    training_samples: trainSet.length,
    validation_samples: validSet.length,
    epochs,
    duration_ms: Date.now() - startTime
  };
}

/**
 * Evaluate model performance
 */
export function evaluateModel(
  weights: ModelWeights,
  examples: TrainingExample[],
  threshold = 0.5
): { accuracy: number; precision: number; recall: number; f1: number } {
  if (examples.length === 0) {
    return { accuracy: 0, precision: 0, recall: 0, f1: 0 };
  }

  let tp = 0, tn = 0, fp = 0, fn = 0;

  for (const example of examples) {
    const predicted = predictClass(example.features, weights, threshold);
    const actual = example.label;

    if (predicted === 1 && actual === 1) tp++;
    else if (predicted === 0 && actual === 0) tn++;
    else if (predicted === 1 && actual === 0) fp++;
    else fn++;
  }

  const accuracy = (tp + tn) / examples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return { accuracy, precision, recall, f1 };
}

/**
 * Federated Averaging: Aggregate multiple model weights
 */
export function federatedAverage(
  modelUpdates: { weights: ModelWeights; samples: number }[]
): ModelWeights {
  if (modelUpdates.length === 0) {
    throw new Error('No model updates to aggregate');
  }

  const totalSamples = modelUpdates.reduce((sum, u) => sum + u.samples, 0);
  const numFeatures = modelUpdates[0].weights.coefficients.length;

  // Weighted average of coefficients
  const avgCoefficients = Array(numFeatures).fill(0);
  let avgIntercept = 0;

  for (const update of modelUpdates) {
    const weight = update.samples / totalSamples; // Sample-weighted contribution
    
    for (let i = 0; i < numFeatures; i++) {
      avgCoefficients[i] += update.weights.coefficients[i] * weight;
    }
    avgIntercept += update.weights.intercept * weight;
  }

  return {
    coefficients: avgCoefficients,
    intercept: avgIntercept
  };
}

/**
 * Apply global model update to local model with momentum
 */
export function applyGlobalUpdate(
  localWeights: ModelWeights,
  globalWeights: ModelWeights,
  momentum = 0.5
): ModelWeights {
  const numFeatures = localWeights.coefficients.length;
  const newCoefficients = Array(numFeatures);

  for (let i = 0; i < numFeatures; i++) {
    newCoefficients[i] = momentum * localWeights.coefficients[i] + 
                         (1 - momentum) * globalWeights.coefficients[i];
  }

  return {
    coefficients: newCoefficients,
    intercept: momentum * localWeights.intercept + (1 - momentum) * globalWeights.intercept
  };
}
