import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFederatedLearning } from '@/hooks/useFederatedLearning';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export function ModelComparisonChart() {
  const { trainingRounds, evaluationResults } = useFederatedLearning();

  // Prepare data for comparison
  const comparisonData = trainingRounds
    .filter(r => r.status === 'completed' && r.global_accuracy)
    .slice(0, 10)
    .reverse()
    .map(round => ({
      round: `Round ${round.round_number}`,
      'Federated': Math.round((round.global_accuracy || 0) * 100),
      'Samples': round.total_samples,
      'Tenants': round.participating_tenants.length
    }));

  // Accuracy trend data
  const accuracyTrend = trainingRounds
    .filter(r => r.status === 'completed')
    .slice(0, 10)
    .reverse()
    .map(round => ({
      round: round.round_number,
      accuracy: Math.round((round.global_accuracy || 0) * 100),
      samples: round.total_samples
    }));

  const chartConfig = {
    federated: {
      label: 'Federated Model',
      color: 'hsl(var(--primary))'
    },
    local: {
      label: 'Local Model',
      color: 'hsl(var(--status-in-progress))'
    }
  };

  if (comparisonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Performance Comparison</CardTitle>
          <CardDescription>
            Complete federated training rounds to see performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No training data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Federated Model Accuracy</CardTitle>
          <CardDescription>
            Global model accuracy across training rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="round" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="Federated" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Accuracy Trend</CardTitle>
          <CardDescription>
            Model improvement over federated training rounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="round" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Round', position: 'bottom' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
