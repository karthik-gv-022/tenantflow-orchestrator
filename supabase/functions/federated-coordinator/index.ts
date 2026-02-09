import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Federated averaging: weighted average of model parameters
function federatedAverage(
  modelUpdates: { weights: { coefficients: number[]; intercept: number }; samples: number }[]
): { coefficients: number[]; intercept: number } {
  if (modelUpdates.length === 0) {
    throw new Error("No model updates to aggregate");
  }

  const totalSamples = modelUpdates.reduce((sum, u) => sum + u.samples, 0);
  const numFeatures = modelUpdates[0].weights.coefficients.length;

  const avgCoefficients = Array(numFeatures).fill(0);
  let avgIntercept = 0;

  for (const update of modelUpdates) {
    const weight = update.samples / totalSamples;
    
    for (let i = 0; i < numFeatures; i++) {
      avgCoefficients[i] += update.weights.coefficients[i] * weight;
    }
    avgIntercept += update.weights.intercept * weight;
  }

  return { coefficients: avgCoefficients, intercept: avgIntercept };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, round_id } = await req.json();

    if (action === "start_round") {
      // Start a new federated training round
      const { data: lastRound } = await supabase
        .from("federated_training_rounds")
        .select("round_number")
        .order("round_number", { ascending: false })
        .limit(1)
        .single();

      const newRoundNumber = (lastRound?.round_number || 0) + 1;

      // Get all tenants with enough data
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id");

      const participatingTenants: string[] = [];
      
      for (const tenant of tenants || []) {
        const { count } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "completed");

        if ((count || 0) >= 10) {
          participatingTenants.push(tenant.id);
        }
      }

      if (participatingTenants.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "No eligible tenants",
            message: "No tenants have sufficient training data (minimum 10 completed tasks)"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new round
      const { data: round, error: roundError } = await supabase
        .from("federated_training_rounds")
        .insert({
          round_number: newRoundNumber,
          participating_tenants: participatingTenants,
          status: "training",
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // Trigger local training for each tenant
      const trainingPromises = participatingTenants.map(async (tenantId) => {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/train-local-model`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`
            },
            body: JSON.stringify({ tenant_id: tenantId, round_id: round.id })
          });
          return { tenantId, success: response.ok, result: await response.json() };
        } catch (e) {
          return { tenantId, success: false, error: e.message };
        }
      });

      const trainingResults = await Promise.all(trainingPromises);
      const successfulTenants = trainingResults.filter(r => r.success).map(r => r.tenantId);

      // Update round with training results
      await supabase
        .from("federated_training_rounds")
        .update({
          participating_tenants: successfulTenants,
          status: successfulTenants.length > 0 ? "aggregating" : "failed",
          metadata: { training_results: trainingResults }
        })
        .eq("id", round.id);

      if (successfulTenants.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "All local training failed",
            results: trainingResults
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          round_id: round.id,
          round_number: newRoundNumber,
          participating_tenants: successfulTenants.length,
          training_results: trainingResults
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "aggregate") {
      // Aggregate model updates from a round
      if (!round_id) {
        throw new Error("round_id is required for aggregation");
      }

      // Fetch training metadata for this round
      const { data: metadata, error: metaError } = await supabase
        .from("tenant_training_metadata")
        .select("*")
        .eq("round_id", round_id);

      if (metaError) throw metaError;

      if (!metadata || metadata.length === 0) {
        return new Response(
          JSON.stringify({ error: "No training metadata found for this round" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prepare model updates for aggregation
      const modelUpdates = metadata.map(m => ({
        weights: m.local_weights as { coefficients: number[]; intercept: number },
        samples: m.training_samples
      }));

      // Perform federated averaging
      const globalWeights = federatedAverage(modelUpdates);
      const totalSamples = metadata.reduce((sum, m) => sum + m.training_samples, 0);

      // Calculate average accuracy
      const avgAccuracy = metadata.reduce((sum, m) => sum + (m.training_accuracy || 0), 0) / metadata.length;

      // Update round with global model
      const { error: updateError } = await supabase
        .from("federated_training_rounds")
        .update({
          global_weights: globalWeights,
          total_samples: totalSamples,
          global_accuracy: avgAccuracy,
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", round_id);

      if (updateError) throw updateError;

      // Distribute global model back to tenants (update their local models)
      for (const m of metadata) {
        const { data: existingModel } = await supabase
          .from("tenant_model_weights")
          .select("model_version")
          .eq("tenant_id", m.tenant_id)
          .order("model_version", { ascending: false })
          .limit(1)
          .single();

        const newVersion = (existingModel?.model_version || 0) + 1;

        // Apply momentum: 50% local, 50% global
        const localWeights = m.local_weights as { coefficients: number[]; intercept: number };
        const hybridWeights = {
          coefficients: localWeights.coefficients.map((c, i) => 
            0.5 * c + 0.5 * globalWeights.coefficients[i]
          ),
          intercept: 0.5 * localWeights.intercept + 0.5 * globalWeights.intercept
        };

        await supabase.from("tenant_model_weights").insert({
          tenant_id: m.tenant_id,
          model_version: newVersion,
          weights: hybridWeights,
          feature_names: ['priority_encoded', 'due_date_gap_hours', 'sla_hours_normalized', 
                          'assignee_workload', 'historical_completion_rate', 'task_complexity',
                          'is_high_priority', 'has_sla'],
          training_samples: m.training_samples,
          accuracy: m.training_accuracy,
          last_trained_at: new Date().toISOString()
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          global_weights: globalWeights,
          total_samples: totalSamples,
          participating_tenants: metadata.length,
          average_accuracy: avgAccuracy
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "get_status") {
      // Get current federated learning status
      const { data: latestRound } = await supabase
        .from("federated_training_rounds")
        .select("*")
        .order("round_number", { ascending: false })
        .limit(1)
        .single();

      const { data: allRounds } = await supabase
        .from("federated_training_rounds")
        .select("round_number, status, global_accuracy, total_samples, participating_tenants, completed_at")
        .order("round_number", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          latest_round: latestRound,
          recent_rounds: allRounds
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Federated coordinator error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
