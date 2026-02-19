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

const SAMPLE_PROJECTS = [
  { name: "Website Redesign", description: "Complete overhaul of the company website with new branding, improved UX, and mobile-first design." },
  { name: "Mobile App v2.0", description: "Major update to the mobile application including offline mode, push notifications, and performance improvements." },
  { name: "Q1 Marketing Campaign", description: "Plan and execute the Q1 marketing campaign across social media, email, and paid channels." },
];

interface SampleTask {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  sla_hours: number | null;
  started_at: string | null;
  completed_at: string | null;
  project_index: number;
}

function getFutureDateISO(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function getPastDateISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const SAMPLE_TASKS: SampleTask[] = [
  // Website Redesign tasks (project_index: 0)
  { title: "Design homepage wireframe", description: "Create low-fidelity wireframes for the new homepage layout.", status: "completed", priority: "high", due_date: getPastDateISO(2), sla_hours: 24, started_at: getPastDateISO(5), completed_at: getPastDateISO(2), project_index: 0 },
  { title: "Implement responsive navigation", description: "Build the main navigation component with mobile hamburger menu.", status: "in_progress", priority: "high", due_date: getFutureDateISO(3), sla_hours: 16, started_at: getPastDateISO(1), completed_at: null, project_index: 0 },
  { title: "Set up CI/CD pipeline", description: "Configure automated builds and deployments for the new website.", status: "review", priority: "medium", due_date: getFutureDateISO(1), sla_hours: 8, started_at: getPastDateISO(3), completed_at: null, project_index: 0 },
  { title: "Write SEO meta tags", description: "Add optimized meta descriptions and Open Graph tags to all pages.", status: "created", priority: "low", due_date: getFutureDateISO(10), sla_hours: 4, started_at: null, completed_at: null, project_index: 0 },
  { title: "Performance audit", description: "Run Lighthouse audits and fix critical performance issues.", status: "created", priority: "critical", due_date: getFutureDateISO(5), sla_hours: 12, started_at: null, completed_at: null, project_index: 0 },

  // Mobile App tasks (project_index: 1)
  { title: "Implement offline data sync", description: "Build local storage layer with conflict resolution for offline mode.", status: "in_progress", priority: "critical", due_date: getFutureDateISO(7), sla_hours: 40, started_at: getPastDateISO(4), completed_at: null, project_index: 1 },
  { title: "Push notification service", description: "Integrate Firebase Cloud Messaging for push notifications.", status: "created", priority: "high", due_date: getFutureDateISO(14), sla_hours: 20, started_at: null, completed_at: null, project_index: 1 },
  { title: "Fix login crash on Android 14", description: "Investigate and fix the crash reported on Android 14 devices during login.", status: "completed", priority: "critical", due_date: getPastDateISO(1), sla_hours: 8, started_at: getPastDateISO(3), completed_at: getPastDateISO(1), project_index: 1 },
  { title: "App store screenshots", description: "Create updated screenshots for iOS and Android app store listings.", status: "created", priority: "medium", due_date: getFutureDateISO(20), sla_hours: 6, started_at: null, completed_at: null, project_index: 1 },

  // Marketing Campaign tasks (project_index: 2)
  { title: "Draft email newsletter", description: "Write and design the Q1 launch email for the subscriber list.", status: "review", priority: "high", due_date: getFutureDateISO(2), sla_hours: 8, started_at: getPastDateISO(2), completed_at: null, project_index: 2 },
  { title: "Create social media calendar", description: "Plan 4 weeks of social media content across all platforms.", status: "completed", priority: "medium", due_date: getPastDateISO(3), sla_hours: 12, started_at: getPastDateISO(7), completed_at: getPastDateISO(3), project_index: 2 },
  { title: "Set up ad tracking pixels", description: "Install Facebook, Google, and LinkedIn tracking pixels on the website.", status: "in_progress", priority: "high", due_date: getFutureDateISO(1), sla_hours: 4, started_at: getPastDateISO(1), completed_at: null, project_index: 2 },
  { title: "Budget approval for paid ads", description: "Get finance sign-off on the $15K monthly ad budget.", status: "created", priority: "critical", due_date: getFutureDateISO(4), sla_hours: null, started_at: null, completed_at: null, project_index: 2 },
];

async function seedDemoData(supabase: any, userId: string, tenantId: string) {
  // Check if this user already has projects (avoid duplicate seeding)
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("created_by", userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  // Create projects
  const projectIds: string[] = [];
  for (const proj of SAMPLE_PROJECTS) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...proj, tenant_id: tenantId, created_by: userId })
      .select("id")
      .single();
    if (error) {
      console.error("Error creating project:", error);
      continue;
    }
    projectIds.push(data.id);
  }

  // Create tasks
  for (const task of SAMPLE_TASKS) {
    const projectId = projectIds[task.project_index];
    if (!projectId) continue;

    const { error } = await supabase.from("tasks").insert({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      sla_hours: task.sla_hours,
      started_at: task.started_at,
      completed_at: task.completed_at,
      tenant_id: tenantId,
      project_id: projectId,
      created_by: userId,
      assignee_id: userId,
    });
    if (error) console.error("Error creating task:", error);
  }
}

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

      // Wait briefly for the handle_new_user trigger to create the profile
      await new Promise((r) => setTimeout(r, 1000));

      // Get tenant_id from the profile created by trigger
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", newUser.user.id)
        .single();

      // Seed sample data
      if (profile?.tenant_id) {
        await seedDemoData(supabase, newUser.user.id, profile.tenant_id);
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
