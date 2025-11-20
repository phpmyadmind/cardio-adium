import { Suspense } from "react";
import { Header } from "@/components/header";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AuthGuard } from "@/components/admin/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  return (
    <div className="min-h-screen relative">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <AuthGuard>
          <h1 className="text-3xl font-bold font-headline mb-6 text-primary">
            Panel de Administración
          </h1>
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <AdminPanel />
          </Suspense>
        </AuthGuard>
      </main>
    </div>
  );
}
