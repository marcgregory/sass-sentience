"use client";

import { cn } from "@sentience/utils";

interface FleetHealthGaugeProps {
  score: number;
  totalDevices?: number;
  className?: string;
}

/**
 * Fleet Health Score gauge.
 *
 * Displays a large numeral with a circular ring gauge and color coding:
 * - Green (90–100): Excellent
 * - Emerald (75–89): Healthy
 * - Amber (50–74): Warning
 * - Red (0–49): Critical
 */
export function FleetHealthGauge({ score, totalDevices, className }: FleetHealthGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 36; // radius=36
  const offset = circumference - (clamped / 100) * circumference;

  const colorClass =
    clamped >= 90
      ? "text-emerald-500 stroke-emerald-500"
      : clamped >= 75
        ? "text-green-600 stroke-green-600"
        : clamped >= 50
          ? "text-amber-500 stroke-amber-500"
          : "text-red-500 stroke-red-500";

  const bgClass =
    clamped >= 90
      ? "stroke-emerald-100 dark:stroke-emerald-950"
      : clamped >= 75
        ? "stroke-green-100 dark:stroke-green-950"
        : clamped >= 50
          ? "stroke-amber-100 dark:stroke-amber-950"
          : "stroke-red-100 dark:stroke-red-950";

  const label =
    clamped >= 90
      ? "Excellent"
      : clamped >= 75
        ? "Healthy"
        : clamped >= 50
          ? "Warning"
          : "Critical";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 80 80">
          {/* Background ring */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            className={bgClass}
          />
          {/* Value ring */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={"transition-all duration-700 " + colorClass.split(" ")[1]}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-3xl font-bold", colorClass.split(" ")[0])}>
            {clamped}
          </span>
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">Fleet Health</p>
      <p className={cn("text-xs font-semibold", colorClass.split(" ")[0])}>{label}</p>
      {totalDevices !== undefined && (
        <p className="text-xs text-muted-foreground">
          {totalDevices} device{totalDevices !== 1 ? "s" : ""} tracked
        </p>
      )}
    </div>
  );
}
