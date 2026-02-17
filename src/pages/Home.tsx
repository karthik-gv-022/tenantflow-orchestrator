import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Workflow,
  BarChart3,
  Shield,
  Zap,
  Users,
  Brain,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ListChecks,
} from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.png';
import { useTasks } from '@/hooks/useTasks';

/* ─── Animated wrapper ─── */
function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`opacity-0 animate-fade-in-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Real stats for logged-in users ─── */
function LiveStats() {
  const { tasks, tasksByStatus, isLoading } = useTasks();

  const totalTasks = tasks.length;
  const completed = tasksByStatus['completed'] ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const inProgress = tasksByStatus['in_progress'] ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <FadeIn delay={200}>
        <Card className="border-0 bg-primary/5 hover-scale">
          <CardContent className="p-4 flex items-center gap-3">
            <ListChecks className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
      <FadeIn delay={300}>
        <Card className="border-0 bg-primary/5 hover-scale">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
      <FadeIn delay={400}>
        <Card className="border-0 bg-primary/5 hover-scale">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

/* ─── Static quick stats for visitors ─── */
function QuickStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { icon: CheckCircle2, label: 'Smart', sub: 'Delay Predictions', delay: 200 },
        { icon: Clock, label: 'Real-time', sub: 'Risk Monitoring', delay: 300 },
        { icon: AlertTriangle, label: 'Proactive', sub: 'SLA Alerts', delay: 400 },
      ].map((s) => (
        <FadeIn key={s.label} delay={s.delay}>
          <Card className="border-0 bg-primary/5 hover-scale">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}

const features = [
  { icon: BarChart3, title: 'Intelligent Analytics', desc: 'Track team performance, workload distribution, and completion trends across your organization.' },
  { icon: Brain, title: 'Federated AI', desc: 'Privacy-preserving machine learning predicts task delays without exposing tenant data.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'Role-based access control with full tenant isolation and audit logging.' },
  { icon: Users, title: 'Multi-Tenant', desc: 'Each organization operates independently with its own data, models, and workflows.' },
  { icon: Zap, title: 'Proactive Alerts', desc: 'Get warned about delay risks, workload imbalances, and SLA breaches before they happen.' },
  { icon: Workflow, title: 'Smart Orchestration', desc: 'Automated task lifecycle management with Kanban boards and real-time collaboration.' },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Workflow className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : user ? (
              <Button asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground mb-6">
                <Brain className="w-4 h-4 text-primary" />
                Powered by Federated Intelligence
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                Intelligent Task Orchestration for Enterprise Teams
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-lg text-muted-foreground mt-6 max-w-xl">
                Predict delays before they happen. Orchestrate workflows with AI-driven insights while keeping every tenant's data private and secure.
              </p>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="flex items-center justify-center lg:justify-start gap-4 mt-8">
                {user ? (
                  <Button size="lg" asChild>
                    <Link to="/dashboard">
                      Open Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild>
                      <Link to="/auth">Start Free</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                  </>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Hero illustration */}
          <FadeIn delay={400} className="hidden lg:block">
            <img
              src={heroIllustration}
              alt="TaskFlow intelligent task orchestration dashboard with charts and connected nodes"
              className="w-full rounded-xl"
              loading="eager"
            />
          </FadeIn>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        {user ? <LiveStats /> : <QuickStats />}
      </section>

      {/* Workspace card (logged-in) */}
      {user && (
        <FadeIn delay={500}>
          <section className="max-w-4xl mx-auto px-6 pb-16">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Your Workspace</h3>
                <p className="text-sm text-muted-foreground">
                  You're logged in — head to the dashboard to see your tasks, predictions, and team analytics.
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Getting started</span>
                    <span className="font-medium">Ready</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <Button asChild className="w-full">
                  <Link to="/dashboard">
                    Continue to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </FadeIn>
      )}

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <FadeIn>
          <h2 className="text-2xl font-bold text-center mb-10">
            Everything you need to orchestrate at scale
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={100 + i * 80}>
              <Card className="border bg-card hover-scale h-full">
                <CardContent className="p-6 space-y-3">
                  <f.icon className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskFlow — Secure, scalable task orchestration for enterprise teams</p>
      </footer>
    </div>
  );
}
