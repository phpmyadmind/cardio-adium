"use client";

import { useAuthContext } from "@/contexts/auth.context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useAuthContext();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user || !user.isAdmin) {
        router.replace("/admin/login");
      } else {
        setAuthChecked(true);
      }
    }
  }, [user, isUserLoading, router]);

  if (!authChecked || isUserLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  return <>{children}</>;
}
