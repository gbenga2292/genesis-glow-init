import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Package, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: 'blue' | 'indigo' | 'purple' | 'green';
}

interface StatCardsProps {
  stats: StatCard[];
  isLoading?: boolean;
}

const statColorMap = {
  blue: 'from-blue-500/10 to-blue-500/5 border-blue-200/30 dark:border-blue-800/30',
  indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200/30 dark:border-indigo-800/30',
  purple: 'from-purple-500/10 to-purple-500/5 border-purple-200/30 dark:border-purple-800/30',
  green: 'from-green-500/10 to-green-500/5 border-green-200/30 dark:border-green-800/30',
};

const iconColorMap = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
};

export const StatCards: React.FC<StatCardsProps> = ({ stats, isLoading = false }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="h-full">
          <Card className={cn(
            'relative overflow-hidden border backdrop-blur-sm h-full',
            'bg-gradient-to-br hover:shadow-lg transition-all duration-300',
            statColorMap[stat.color],
            isLoading && 'opacity-50 cursor-not-allowed'
          )}>
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    {isLoading ? '...' : stat.value}
                  </p>
                  {stat.change && (
                    <p className={cn(
                      'text-xs font-medium flex items-center gap-1',
                      stat.trend === 'up' && 'text-green-600 dark:text-green-400',
                      stat.trend === 'down' && 'text-red-600 dark:text-red-400',
                      !stat.trend && 'text-muted-foreground'
                    )}>
                      {stat.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className={cn(
                  'p-3 rounded-lg',
                  iconColorMap[stat.color]
                )}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
