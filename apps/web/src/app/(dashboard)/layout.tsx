import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RealtimeListener } from "@/components/layout/realtime-listener";
import { AuthGuard } from "@/components/shared/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealtimeListener />
      <AuthGuard>
        <DashboardShell>{children}</DashboardShell>
      </AuthGuard>
    </>
  );
}
