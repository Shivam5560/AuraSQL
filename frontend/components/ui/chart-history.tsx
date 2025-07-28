"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

import {
  CardContent,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

import { useTheme } from "next-themes"

interface DailyStatsItem {
  date: string;
  generated: number;
  executed: number;
  total: number;
  percentageRise?: number;
}

interface ChartHistoryProps {
  data: DailyStatsItem[];
}

export function ChartHistory({ data }: ChartHistoryProps) {
  const { theme } = useTheme();
  const generatedColor = theme === 'dark' ? 'hsl(var(--chart-generated-dark))' : 'hsl(var(--chart-generated-light))';
  const executedColor = theme === 'dark' ? 'hsl(var(--chart-executed-dark))' : 'hsl(var(--chart-executed-light))';

  return (
    <React.Fragment>
      <ChartContainer
        config={{
          generated: { label: 'Generated', color: generatedColor },
          executed: { label: 'Executed', color: executedColor },
        }}
        className="aspect-auto h-[250px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis stroke="hsl(var(--foreground))" />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload}
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              )}
            />
            <Bar
              dataKey="generated"
              fill={generatedColor}
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="executed"
              fill={executedColor}
              stackId="a"
              radius={[4, 4, 0, 0]}
            />
            <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      {data.length > 1 && data[data.length - 1].percentageRise !== undefined && (
        <div className="mt-4 text-center text-sm">
          <p>Total queries today: {data[data.length - 1].total}</p>
          <p className={data[data.length - 1].percentageRise! >= 0 ? "text-green-500" : "text-red-500"}>
            {data[data.length - 1].percentageRise! >= 0 ? '▲' : '▼'} {Math.abs(data[data.length - 1].percentageRise!).toFixed(2)}% from previous day
          </p>
        </div>
      )}
    </React.Fragment>
  );
}