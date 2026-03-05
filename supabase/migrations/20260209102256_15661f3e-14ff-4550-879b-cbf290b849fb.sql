-- Federated Learning Schema for Multi-Tenant Task Delay Prediction

-- Store local model weights per tenant (federated client)
CREATE TABLE public.tenant_model_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_version INTEGER NOT NULL DEFAULT 1,
  weights JSONB NOT NULL, -- Logistic regression coefficients
  feature_names TEXT[] NOT NULL, -- Names of features used
  training_samples INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,4), -- Local model accuracy
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  last_trained_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, model_version)
);

-- Track federated training rounds
CREATE TABLE public.federated_training_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number INTEGER NOT NULL,
  global_weights JSONB, -- Aggregated global model weights
  participating_tenants UUID[] NOT NULL DEFAULT '{}',
  aggregation_method TEXT NOT NULL DEFAULT 'federated_averaging',
  total_samples INTEGER NOT NULL DEFAULT 0,
  global_accuracy DECIMAL(5,4),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'aggregating', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Store training metadata and evaluation metrics per tenant per round
CREATE TABLE public.tenant_training_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.federated_training_rounds(id) ON DELETE CASCADE,
  local_weights JSONB NOT NULL,
  training_samples INTEGER NOT NULL,
  validation_samples INTEGER NOT NULL DEFAULT 0,
  training_accuracy DECIMAL(5,4),
  validation_accuracy DECIMAL(5,4),
  loss DECIMAL(10,6),
  epochs_completed INTEGER NOT NULL DEFAULT 1,
  training_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, round_id)
);

-- Store model evaluation comparisons (centralized vs federated)
CREATE TABLE public.model_evaluation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for global evaluation
  evaluation_type TEXT NOT NULL CHECK (evaluation_type IN ('federated', 'centralized', 'local')),
  round_id UUID REFERENCES public.federated_training_rounds(id),
  test_samples INTEGER NOT NULL,
  accuracy DECIMAL(5,4) NOT NULL,
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  true_positives INTEGER,
  true_negatives INTEGER,
  false_positives INTEGER,
  false_negatives INTEGER,
  auc_roc DECIMAL(5,4),
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.tenant_model_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federated_training_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_training_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_evaluation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_model_weights (tenant isolation)
CREATE POLICY "Users can view their tenant's model weights"
ON public.tenant_model_weights FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System can insert model weights"
ON public.tenant_model_weights FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System can update model weights"
ON public.tenant_model_weights FOR UPDATE
USING (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

-- RLS Policies for federated_training_rounds (admin only for management)
CREATE POLICY "Admins can view training rounds"
ON public.federated_training_rounds FOR SELECT
USING (has_role(auth.uid(), 'tenant_admin'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System admins can manage training rounds"
ON public.federated_training_rounds FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- RLS Policies for tenant_training_metadata
CREATE POLICY "Users can view their tenant's training metadata"
ON public.tenant_training_metadata FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System can insert training metadata"
ON public.tenant_training_metadata FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

-- RLS Policies for model_evaluation_results
CREATE POLICY "Users can view evaluation results"
ON public.model_evaluation_results FOR SELECT
USING (tenant_id IS NULL OR tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System can insert evaluation results"
ON public.model_evaluation_results FOR INSERT
WITH CHECK (tenant_id IS NULL OR tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_tenant_model_weights_tenant ON public.tenant_model_weights(tenant_id);
CREATE INDEX idx_tenant_model_weights_version ON public.tenant_model_weights(tenant_id, model_version DESC);
CREATE INDEX idx_federated_rounds_status ON public.federated_training_rounds(status);
CREATE INDEX idx_training_metadata_tenant ON public.tenant_training_metadata(tenant_id);
CREATE INDEX idx_training_metadata_round ON public.tenant_training_metadata(round_id);
CREATE INDEX idx_evaluation_results_type ON public.model_evaluation_results(evaluation_type);

-- Trigger for updating updated_at
CREATE TRIGGER update_tenant_model_weights_updated_at
BEFORE UPDATE ON public.tenant_model_weights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();