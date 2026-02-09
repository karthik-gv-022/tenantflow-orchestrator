-- Create task_delay_predictions table for storing prediction results
CREATE TABLE public.task_delay_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  predicted_delayed BOOLEAN NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  prediction_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prediction_trigger TEXT NOT NULL CHECK (prediction_trigger IN ('creation', 'in_progress')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, prediction_trigger)
);

-- Enable RLS
ALTER TABLE public.task_delay_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY "Users can view predictions in their tenant"
ON public.task_delay_predictions
FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()) OR has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System can insert predictions"
ON public.task_delay_predictions
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "System can update predictions"
ON public.task_delay_predictions
FOR UPDATE
USING (tenant_id = get_user_tenant(auth.uid()));

-- Index for efficient lookups
CREATE INDEX idx_task_delay_predictions_task_id ON public.task_delay_predictions(task_id);
CREATE INDEX idx_task_delay_predictions_tenant_id ON public.task_delay_predictions(tenant_id);

-- Enable realtime for predictions
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_delay_predictions;