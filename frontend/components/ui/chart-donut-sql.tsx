"use client"

import * as React from "react"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

// Force re-render/rebuild

interface ChartDonutSqlProps {
  generatedCount: number;
  executedCount: number;
}

export function ChartDonutSql({ generatedCount, executedCount }: ChartDonutSqlProps) {
  const totalQueries = generatedCount + executedCount;

  const generatedColor = 'hsl(var(--chart-1))';
  const executedColor = 'hsl(var(--chart-2))';

  const chartData = [
    { name: "Generated", value: generatedCount },
    { name: "Executed", value: executedCount },
  ];

  const chartConfig = {
    generated: {
      label: "Generated",
      color: "var(--chart-1)",
    },
    executed: {
      label: "Executed",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square h-[200px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0];
              const percentage = totalQueries > 0 ? ((data.value / totalQueries) * 100).toFixed(1) : 0;
              return (
                <ChartTooltipContent
                  className="p-2"
                  indicator="dot"
                  payload={[
                    { name: data.name, value: `${data.value} (${percentage}%)`, color: data.fill },
                  ]}
                />
              );
            }
            return null;
          }}
        />
        <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={80}
            strokeWidth={2}
            paddingAngle={5}
            cornerRadius={5}
            fill="none"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.name === "Generated" ? generatedColor : executedColor} />
          ))}
        </Pie>
        <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-bold"
            fill="white"
          >
            {totalQueries}
            <tspan x="50%" y="50%" dy="1.5em" className="fill-muted-foreground text-sm" fill="grey">
              Total SQL
            </tspan>
          </text>
        </PieChart>
      </ResponsiveContainer>
      <ChartLegend content={({ payload }) => <ChartLegendContent payload={payload} />} className="mt-4" />
    </ChartContainer>
  );
}
