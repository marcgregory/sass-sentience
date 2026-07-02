"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff, AlertTriangle, Activity, FileDown } from "lucide-react";

interface QuickActionsProps {
  offlineCount?: number;
  faultCount?: number;
}

/**
 * Quick Action cards — shortcuts to common operations with live counts.
 */
export function QuickActions({ offlineCount, faultCount }: QuickActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href="/devices?status=offline">
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-3 px-4 py-3"
        >
          <WifiOff className="h-5 w-5 text-slate-500" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">View Offline</span>
            {offlineCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {offlineCount} device{offlineCount !== 1 ? "s" : ""} offline
              </span>
            )}
          </div>
        </Button>
      </Link>
      <Link href="/devices?status=fault">
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-3 px-4 py-3"
        >
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">View Faults</span>
            {faultCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {faultCount} device{faultCount !== 1 ? "s" : ""} in fault
              </span>
            )}
          </div>
        </Button>
      </Link>
      <Link href="/diagnostics">
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-3 px-4 py-3"
        >
          <Activity className="h-5 w-5 text-blue-500" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">Open Diagnostics</span>
            <span className="text-xs text-muted-foreground">
              Run system checks
            </span>
          </div>
        </Button>
      </Link>
      <Button
        variant="outline"
        className="h-auto justify-start gap-3 px-4 py-3"
        disabled
      >
        <FileDown className="h-5 w-5 text-muted-foreground" />
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium">Export Report</span>
          <span className="text-xs text-muted-foreground">
            Coming soon
          </span>
        </div>
      </Button>
    </div>
  );
}
