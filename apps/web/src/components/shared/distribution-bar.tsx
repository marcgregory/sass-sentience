"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { colorClassToHex, type DistributionItem } from "@sentience/utils";

interface DistributionBarProps {
  data: DistributionItem[];
  title: string;
  description?: string;
  /**
   * Tailwind fill color for the bars when the chart should use a single
   * color. When omitted, each bar uses its item's color (variegated).
   */
  uniformColor?: string;
}

/**
 * A small horizontal bar chart for showing distribution data
 * (battery, signal, temperature).
 */
export function DistributionBar({
  data,
  title,
  description,
  uniformColor,
}: DistributionBarProps) {
  // Map background color classes to rechart fill --- use a CSS variable
  // approach: derive a fill from the bg-* class by mapping it to a
  // recharts-friendly color value.
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    count: d.count,
    fill: uniformColor ?? colorClassToHex(d.color),
  }));

  return (
    <div>
      <p className="mb-1 text-sm font-medium">{title}</p>
      {description && (
        <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="h-48">
        {data.every((d) => d.value === 0) ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
              barCategoryGap="20%"
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={90}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => {
                  const pct = `${value}%`;
                  const count = props.payload?.count;
                  return count !== undefined ? [`${pct} (${count} device${count !== 1 ? "s" : ""})`] : [pct];
                }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--card-foreground))",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={20}
                // Recharts picks fill from data
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}


