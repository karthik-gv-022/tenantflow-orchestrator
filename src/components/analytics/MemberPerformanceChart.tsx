import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MemberPerformance } from '@/hooks/useTeamAnalytics';

interface MemberPerformanceChartProps {
  data: MemberPerformance[];
}

export function MemberPerformanceChart({ data }: MemberPerformanceChartProps) {
  const chartData = data.slice(0, 8).map(m => ({
    name: m.memberName.length > 10 ? m.memberName.slice(0, 10) + '...' : m.memberName,
    completed: m.completedTasks,
    inProgress: m.inProgressTasks
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tasks by Team Member</CardTitle>
          <CardDescription>Task completion and progress per team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No team data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tasks by Team Member</CardTitle>
        <CardDescription>Task completion and progress per team member</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="completed" 
                name="Completed" 
                fill="hsl(var(--status-completed))" 
                radius={[0, 4, 4, 0]}
              />
              <Bar 
                dataKey="inProgress" 
                name="In Progress" 
                fill="hsl(var(--status-in-progress))" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
