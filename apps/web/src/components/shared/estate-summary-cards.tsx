"use client";

import Link from "next/link";
import { cn, type EstateSummary } from "@sentience/utils";
import { StatusDot } from "@/components/shared/status-dot";

interface EstateSummaryCardsProps {
  estates: EstateSummary[];
  className?: string;
}

/**
 * Estate Summary cards — one card per estate showing device counts
 * with status dot breakdowns and a drill-down link.
 */
export function EstateSummaryCards({ estates, className }: EstateSummaryCardsProps) {
  if (estates.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No estate data available.
      </p>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {estates.map((estate) => (
        <Link
          key={estate.id}
          href={`/sites?estate=${estate.id}`}
          className="group rounded-lg border p-4 transition-colors hover:bg-accent/50"
        >
          <p className="mb-2 text-sm font-medium group-hover:underline">
            {estate.name}
          </p>
          <p className="mb-2 text-2xl font-bold">{estate.total}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <StatusDot status="online" />
              {estate.online}
            </span>
            <span className="inline-flex items-center gap-1">
              <StatusDot status="offline" />
              {estate.offline}
            </span>
            <span className="inline-flex items-center gap-1">
              <StatusDot status="fault" />
              {estate.fault}
            </span>
            <span className="inline-flex items-center gap-1">
              <StatusDot status="warning" />
              {estate.warning}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
