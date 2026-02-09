import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MemberPerformance } from '@/hooks/useTeamAnalytics';

interface CompletionTimeChartProps {
  data: MemberPerformance[];
}

export function CompletionTimeChart({ data }: CompletionTimeChartProps) {
  const chartData = data
    .filter(m => m.avgCompletionTimeHours !== null)
    .slice(0, 8)
    .map(m => ({
      name: m.memberName.length > 10 ? m.memberName.slice(0, 10) + '...' : m.memberName,
      hours: m.avgCompletionTimeHours,
      fullName: m.memberName
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Average Completion Time</CardTitle>
          <CardDescription>Hours from start to completion per member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No completion data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Color scale based on hours (lower is better)
  const getBarColor = (hours: number) => {
    if (hours <= 8) return 'hsl(var(--status-completed))';
    if (hours <= 24) return 'hsl(var(--chart-3))';
    if (hours <= 48) return 'hsl(var(--priority-high))';
    return 'hsl(var(--destructive))';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Average Completion Time</CardTitle>
        <CardDescription>Hours from start to completion per member</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} hours`, 'Avg Time']}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.hours || 0)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
