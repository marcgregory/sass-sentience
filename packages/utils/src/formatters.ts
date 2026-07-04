export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "<1m";
}

/**
 * Format battery percentage: integer (or 1dp for values < 10 to show precision).
 * Never show more than 1 decimal place.
 */
export function formatBattery(pct: number | null | undefined): string {
  if (pct == null) return "N/A";
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
}

/**
 * Format signal strength: 1 decimal place (or integer if exact).
 * Never show more than 1 decimal place.
 */
export function formatSignalStrength(dbm: number): string {
  const rounded = Math.round(dbm * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} dBm` : `${rounded.toFixed(1)} dBm`;
}

export function formatVoltage(v: number): string {
  return `${v.toFixed(1)}V`;
}

export function formatTemperature(c: number): string {
  return `${c.toFixed(1)}°C`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}
