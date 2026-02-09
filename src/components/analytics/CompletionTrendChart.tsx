import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CompletionTrend } from '@/hooks/useTeamAnalytics';

interface CompletionTrendChartProps {
  data: CompletionTrend[];
}

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  const hasData = data.some(d => d.completed > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Completion Trend</CardTitle>
        <CardDescription>Tasks completed over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          {!hasData ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No completions in the last 7 days
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--status-completed))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--status-completed))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} tasks`, 'Completed']}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--status-completed))"
                  strokeWidth={2}
                  fill="url(#completedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
