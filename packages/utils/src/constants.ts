export const STATUS_COLORS = {
  online: {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    light: "bg-emerald-50 dark:bg-emerald-950/30",
    label: "Online",
  },
  offline: {
    bg: "bg-slate-400",
    text: "text-slate-400",
    light: "bg-slate-50 dark:bg-slate-900/50",
    label: "Offline",
  },
  fault: {
    bg: "bg-red-500",
    text: "text-red-500",
    light: "bg-red-50 dark:bg-red-950/30",
    label: "Fault",
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-amber-500",
    light: "bg-amber-50 dark:bg-amber-950/30",
    label: "Warning",
  },
} as const;

export const SEVERITY_COLORS = {
  critical: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
    dot: "bg-red-500",
    icon: "text-red-500",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: "text-amber-500",
  },
  info: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: "text-blue-500",
  },
} as const;

export const DEVICE_TYPES = [
  { value: "controller", label: "Controller" },
  { value: "sensor", label: "Sensor" },
  { value: "gateway", label: "Gateway" },
  { value: "relay", label: "Relay" },
  { value: "camera", label: "Camera" },
] as const;

export const FIRMWARE_STATUS_COLORS = {
  active: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "Active",
  },
  deprecated: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Deprecated",
  },
} as const;

export const ALERT_CATEGORIES = [
  "device_offline",
  "device_fault",
  "battery_low",
  "signal_weak",
  "temperature_high",
  "voltage_drop",
  "connection_lost",
  "firmware_outdated",
  "config_change",
  "threshold_breach",
  "system",
  "other",
] as const;
