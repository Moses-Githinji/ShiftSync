"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
]

export interface PieChartData {
  name: string
  value: number
  skills?: string[]
}

interface PieChartProps {
  data: PieChartData[]
  config?: ChartConfig
  className?: string
}

export function PieChartComponent({
  data,
  config = {},
  className
}: PieChartProps) {
  const chartConfig: ChartConfig = {
    ...config,
    value: {
      label: "Hours",
      color: "var(--primary)",
    },
  }

  if (data.length === 0) {
    return (
      <ChartContainer config={chartConfig} className={className}>
        <div className="flex items-center justify-center h-62.5 w-full text-muted-foreground">
          No shift data for selected day
        </div>
      </ChartContainer>
    )
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <ChartContainer config={chartConfig} className={className}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltipContent
                formatter={(value: any) => {
                  const numValue = typeof value === 'number' ? value : parseFloat(value as string);
                  return [!isNaN(numValue) ? `${numValue.toFixed(1)}` : "0", "Hours"];
                }}
              />
            }
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingRight: 20 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}