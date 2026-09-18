"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon } from "lucide-react"

export interface MetricCard {
  title: string;
  value: string | number;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
  footer: string;
}

export function SectionCards({ metrics, layout = 'grid' }: { metrics: MetricCard[], layout?: 'grid' | 'horizontal' }) {
  const baseClasses = "*:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card";
  const layoutClasses = layout === 'horizontal'
    ? "flex flex-row overflow-x-auto gap-4 px-4 pb-4 snap-x lg:px-6 *:data-[slot=card]:min-w-[240px] *:data-[slot=card]:snap-center"
    : "grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`${layoutClasses} ${baseClasses}`}>
      {metrics.map((metric, i) => (
        <Card key={i} className="@container/card">
          <CardHeader className="p-5">
            <CardDescription className="text-sm">{metric.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {metric.value}
            </CardTitle>
            {metric.badge && (
              <CardAction>
                <Badge variant="outline">
                  {metric.trend === 'up' && <TrendingUpIcon />}
                  {metric.trend === 'down' && <TrendingDownIcon />}
                  {metric.trend === 'neutral' && <ActivityIcon />}
                  <span className="ml-1">{metric.badge}</span>
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">{metric.footer}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
