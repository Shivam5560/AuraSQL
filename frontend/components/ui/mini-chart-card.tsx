"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface MiniChartCardProps {
  title: string;
  total: number;
  data: { date: string; value: number }[];
  percentageChange: number;
  dataKey: string;
}

export function MiniChartCard({
  title,
  total,
  data,
  percentageChange,
  dataKey,
}: MiniChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-muted-foreground"
        >
          <path d="M12 2v20M17 5H7l-2 10h14l-2 10z" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
        <p className={`text-xs ${percentageChange >= 0 ? "text-green-500" : "text-red-500"}`}>
          {percentageChange >= 0 ? '▲' : '▼'} {Math.abs(percentageChange).toFixed(2)}% from previous period
        </p>
        <div className="h-[80px]">
          <ChartContainer
            config={{
              [dataKey]: { label: title, color: "hsl(var(--primary))" },
            }}
            className="aspect-auto h-[80px] w-full"
          >
            <AreaChart
              data={data}
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id={`fill${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
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
                type="monotone"
                dataKey={dataKey}
                stroke="hsl(var(--primary))"
                fill="url(#fill${dataKey})"
                strokeWidth={2}
                dot={true}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}