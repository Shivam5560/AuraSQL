"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, Legend } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// This is the actual Shadcn Chart components file.
// It wraps Recharts and provides a consistent API.

// ChartConfig type (simplified for this example)
export type ChartConfig = {
  [k: string]: {
    label?: string;
    color?: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
};

export function ChartContainer({
  config,
  children,
  className,
}: {
  config: ChartConfig;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full h-[250px] ${className}`}
      style={
        Object.entries(config).reduce((acc, [key, value]) => {
          return {
            ...acc,
            [`--color-${key}`]: value.color,
          }
        }, {} as React.CSSProperties)
      }
    >
      {children}
    </div>
  )
}

export function ChartTooltip({ content, cursor = false }: { content: (props: { active?: boolean; payload?: readonly any[]; }) => React.ReactNode; cursor?: boolean; }) {
  return <Tooltip cursor={cursor} content={content} />
}

export function ChartTooltipContent({
  labelFormatter,
  indicator = "dot",
  className,
  itemClassName,
  active,
  payload,
}: {
  labelFormatter?: (value: string) => string;
  indicator?: "dot" | "line";
  className?: string;
  itemClassName?: string;
  active?: boolean;
  payload?: readonly any[];
}) {
  if (!(active && payload && payload.length)) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-1 px-2 py-1 text-xs">
        {labelFormatter ? (
          <div className="text-muted-foreground">
            {labelFormatter(payload[0].payload.date)}
          </div>
        ) : null}
        {payload.map((item: any) => (
          <div
            key={item.dataKey}
            className={`flex items-center gap-2 ${itemClassName}`}
          >
            {indicator === "dot" && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {indicator === "line" && (
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {item.name}: {item.value}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ChartLegend({ content, className }: { content: (props: { payload?: readonly any[]; }) => React.ReactNode; className?: string; }) {
  return <Legend content={content} className={className} />;
}

export function ChartLegendContent({ className, payload }: { className?: string; payload?: readonly any[]; }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 ${className}`}
    >
      {payload?.map((item: any) => (
        <div
          key={item.value}
          className="flex items-center gap-1"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.value}
        </div>
      ))}
    </div>
  );
}