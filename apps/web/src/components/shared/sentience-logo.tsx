import { cn } from "@sentience/utils";

type SentienceLogoProps = {
  className?: string;
  size?: "sm" | "lg";
};

export function SentienceLogo({ className, size = "sm" }: SentienceLogoProps) {
  const isLarge = size === "lg";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-sm ring-1 ring-white/20",
        isLarge ? "h-12 w-12" : "h-7 w-7 rounded-lg",
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.95),transparent_30%),linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#14b8a6_100%)]" />
      <span className="absolute -right-1 -top-1 h-1/2 w-1/2 rounded-full bg-cyan-200/45 blur-md" />
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Sentience"
        className={cn(
          "relative drop-shadow-[0_1px_6px_rgba(255,255,255,0.55)]",
          isLarge ? "h-8 w-8" : "h-5 w-5",
        )}
      >
        <path
          d="M33.7 12.8c-2.2-1.8-5.1-2.8-8.5-2.8-6.2 0-10.5 3-10.5 7.7 0 4.4 3.5 6.2 9.1 7.4 4.1.9 5.6 1.7 5.6 3.8 0 2-1.8 3.5-5 3.5-3.8 0-6.5-1.3-8.7-3.5"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5.2"
        />
        <path
          d="M34.1 13.2 39 8.3M14 35.5l-5 5"
          fill="none"
          stroke="#a7f3d0"
          strokeLinecap="round"
          strokeWidth="3.8"
        />
        <circle cx="39" cy="8.3" r="2.5" fill="#cffafe" />
        <circle cx="9" cy="40.5" r="2.5" fill="#bfdbfe" />
      </svg>
    </span>
  );
}
