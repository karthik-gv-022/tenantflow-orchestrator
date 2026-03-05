import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'assignment' | 'overdue';
  taskId: string;
  taskTitle: string;
  assigneePhone?: string;
  assigneeName: string;
  assignerName?: string;
  dueDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, taskId, taskTitle, assigneePhone, assigneeName, assignerName, dueDate }: NotificationRequest = await req.json();

    if (!taskTitle) {
      throw new Error("Missing required fields");
    }

    // For now, just log the notification - SMS integration can be added later
    console.log(`Notification: ${type} for task "${taskTitle}" to ${assigneeName} (${assigneePhone})`);

    return new Response(JSON.stringify({ success: true, message: "Notification logged" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
