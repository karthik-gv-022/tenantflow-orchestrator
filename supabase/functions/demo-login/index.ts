import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_ACCOUNTS: Record<
  string,
  { email: string; password: string; fullName: string; role: string }
> = {
  system_admin: {
    email: "demo-admin@taskflow.app",
    password: "DemoAdmin@2026!",
    fullName: "Alex Admin",
    role: "system_admin",
  },
  tenant_admin: {
    email: "demo-tenant@taskflow.app",
    password: "DemoTenant@2026!",
    fullName: "Taylor Tenant",
    role: "tenant_admin",
  },
  manager: {
    email: "demo-manager@taskflow.app",
    password: "DemoManager@2026!",
    fullName: "Morgan Manager",
    role: "manager",
  },
  team_lead: {
    email: "demo-lead@taskflow.app",
    password: "DemoLead@2026!",
    fullName: "Jordan Lead",
    role: "team_lead",
  },
  team_member: {
    email: "demo-member@taskflow.app",
    password: "DemoMember@2026!",
    fullName: "Sam Member",
    role: "team_member",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role } = await req.json();

    const account = DEMO_ACCOUNTS[role];
    if (!account) {
      return new Response(
        JSON.stringify({ error: "Invalid demo role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to sign in first
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (signInError?.message?.includes("Invalid login credentials")) {
      // Create the demo user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });

      if (createError) throw createError;

      // Update the role
      if (newUser.user && account.role !== "team_member") {
        await supabase
          .from("user_roles")
          .update({ role: account.role })
          .eq("user_id", newUser.user.id);
      }

      // Sign in with the newly created account
      const { data, error } = await anonClient.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (error) throw error;
      signInData = data;
    } else if (signInError) {
      throw signInError;
    }

    return new Response(
      JSON.stringify({
        session: signInData.session,
        user: signInData.user,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Demo login error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
