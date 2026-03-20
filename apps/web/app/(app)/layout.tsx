import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </div>
  );
}
