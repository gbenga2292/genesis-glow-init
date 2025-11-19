import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface TrendChartProps {
  data: number[];
  trend: "up" | "down" | "neutral";
  percentage: number;
}

export const TrendChart = ({ data, trend, percentage }: TrendChartProps) => {
  const chartData = data.map((value, index) => ({ value, index }));
  
  const trendConfig = {
    up: { icon: TrendingUp, color: "text-success", fill: "hsl(var(--success) / 0.2)" },
    down: { icon: TrendingDown, color: "text-destructive", fill: "hsl(var(--destructive) / 0.2)" },
    neutral: { icon: Minus, color: "text-muted-foreground", fill: "hsl(var(--muted) / 0.2)" }
  };

  const config = trendConfig[trend];
  const TrendIcon = config.icon;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1">
        <TrendIcon className={`h-4 w-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {percentage > 0 ? "+" : ""}{percentage}%
        </span>
      </div>
      <div className="h-8 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${trend}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.fill} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={config.fill} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={`hsl(var(--${trend === 'up' ? 'success' : trend === 'down' ? 'destructive' : 'muted-foreground'}))`}
              fill={`url(#gradient-${trend})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
