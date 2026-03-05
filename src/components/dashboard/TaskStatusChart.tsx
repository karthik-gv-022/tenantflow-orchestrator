import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskStatus } from '@/types';

interface TaskStatusChartProps {
  data: Record<TaskStatus, number>;
}

const statusColors: Record<TaskStatus, string> = {
  created: 'hsl(var(--status-created))',
  in_progress: 'hsl(var(--status-in-progress))',
  review: 'hsl(var(--status-review))',
  completed: 'hsl(var(--status-completed))'
};

const statusLabels: Record<TaskStatus, string> = {
  created: 'Created',
  in_progress: 'In Progress',
  review: 'In Review',
  completed: 'Completed'
};

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  const chartData = Object.entries(data).map(([status, value]) => ({
    name: statusLabels[status as TaskStatus],
    value,
    status
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tasks by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={statusColors[entry.status as TaskStatus]}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
