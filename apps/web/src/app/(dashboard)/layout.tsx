import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RealtimeListener } from "@/components/layout/realtime-listener";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealtimeListener />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
