import type { ReactNode } from "react";
import { UserAuthGuard } from "@/components/user-auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UserAuthGuard>
      <div className="min-h-screen relative">
        {children}
      </div>
    </UserAuthGuard>
  );
}
