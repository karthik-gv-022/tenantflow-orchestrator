import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'assignment' | 'overdue';
  taskId: string;
  taskTitle: string;
  assigneeEmail: string;
  assigneeName: string;
  assignerName?: string;
  dueDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, taskId, taskTitle, assigneeEmail, assigneeName, assignerName, dueDate }: NotificationRequest = await req.json();

    if (!assigneeEmail || !taskTitle) {
      throw new Error("Missing required fields");
    }

    let subject: string;
    let html: string;

    if (type === 'assignment') {
      subject = `New Task Assigned: ${taskTitle}`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">New Task Assignment</h1>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
            Hi ${assigneeName || 'there'},
          </p>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
            ${assignerName ? `${assignerName} has assigned you a new task:` : 'You have been assigned a new task:'}
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 10px 0;">${taskTitle}</h2>
            ${dueDate ? `<p style="color: #666; font-size: 14px; margin: 0;">Due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          </div>
          <p style="color: #4a4a4a; font-size: 14px;">
            Log in to your dashboard to view the full details and get started.
          </p>
        </div>
      `;
    } else {
      subject = `Overdue Task: ${taskTitle}`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">⚠️ Task Overdue</h1>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
            Hi ${assigneeName || 'there'},
          </p>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
            The following task is now overdue and requires your attention:
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #991b1b; font-size: 18px; margin: 0 0 10px 0;">${taskTitle}</h2>
            ${dueDate ? `<p style="color: #b91c1c; font-size: 14px; margin: 0;">Was due: ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          </div>
          <p style="color: #4a4a4a; font-size: 14px;">
            Please prioritize completing this task or update its status in your dashboard.
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Task Orchestration <noreply@resend.dev>",
      to: [assigneeEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
