import { AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DelayRiskLevel, PredictionResult } from '@/types/prediction';
import { getRiskLevelColor } from '@/services/delayPrediction';
import { cn } from '@/lib/utils';

interface DelayRiskBadgeProps {
  prediction: PredictionResult | null;
  compact?: boolean;
}

const riskIcons: Record<DelayRiskLevel, typeof AlertTriangle> = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: Clock,
  low: CheckCircle
};

const riskLabels: Record<DelayRiskLevel, string> = {
  critical: 'Critical Risk',
  high: 'High Risk',
  medium: 'Medium Risk',
  low: 'Low Risk'
};

export function DelayRiskBadge({ prediction, compact = false }: DelayRiskBadgeProps) {
  if (!prediction) return null;
  
  const { risk_level, confidence_score, predicted_delayed, recommendations } = prediction;
  const Icon = riskIcons[risk_level];
  const colorClass = getRiskLevelColor(risk_level);
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        predicted_delayed ? colorClass : 'text-status-completed',
        compact && 'px-1.5 py-0.5 text-xs'
      )}
    >
      <Icon className={cn('w-3 h-3', compact && 'w-2.5 h-2.5')} />
      {!compact && (
        <span>
          {predicted_delayed ? riskLabels[risk_level] : 'On Track'}
        </span>
      )}
      {!compact && (
        <span className="text-muted-foreground ml-1">
          {Math.round(confidence_score * 100)}%
        </span>
      )}
    </Badge>
  );
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {predicted_delayed ? 'Delay Predicted' : 'On Track for Completion'}
            </p>
            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(confidence_score * 100)}%
            </p>
            {recommendations.length > 0 && (
              <ul className="text-xs space-y-1">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
