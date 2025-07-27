"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

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
  return (
    <>
      <ChartContainer
        config={{
          generated: { label: 'Generated', color: 'hsl(var(--foreground))' },
          executed: { label: 'Executed', color: 'hsl(var(--muted-foreground))' },
        }}
        className="aspect-auto h-[250px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillGenerated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-generated)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-generated)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillExecuted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-executed)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-executed)" stopOpacity={0.1} />
            </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
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
            <YAxis />
            <ChartTooltip
              cursor={false}
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
            <Area
              dataKey="generated"
              type="monotone"
              fill="url(#fillGenerated)"
              stroke="var(--color-generated)"
              stackId="a"
              dot={true}
            />
            <Area
              dataKey="executed"
              type="monotone"
              fill="url(#fillExecuted)"
              stroke="var(--color-executed)"
              stackId="a"
              dot={true}
            />
            <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} />
          </AreaChart>
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
    </>
  );
}