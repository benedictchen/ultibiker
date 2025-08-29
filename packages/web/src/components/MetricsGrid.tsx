import { Card, CardContent } from '@ultibiker/shared';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface Metric {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
}

interface MetricsGridProps {
  metrics: Metric[];
  className?: string;
}

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4', className)}>
      {metrics.map((metric) => (
        <Card key={metric.title} className="p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className={clsx('p-2 rounded-lg', metric.bgColor)}>
                <metric.icon className={clsx('w-6 h-6', metric.color)} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  {metric.unit && (
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      {metric.unit}
                    </span>
                  )}
                </p>
                {metric.change && (
                  <div className="flex items-center mt-1">
                    <span className={clsx(
                      'text-xs font-medium',
                      metric.change.type === 'increase' ? 'text-green-600' :
                      metric.change.type === 'decrease' ? 'text-red-600' :
                      'text-gray-600'
                    )}>
                      {metric.change.type === 'increase' ? '+' : ''}
                      {metric.change.value}
                      {metric.unit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}