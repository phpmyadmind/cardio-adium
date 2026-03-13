import { useAuthContext } from "../contexts/auth.context";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Skeleton } from "./ui/skeleton";

const SESSION_STORAGE_KEY = "campus_connect_session";

const hasSession = () => {
  if (typeof window === "undefined") return false;
  try {
    const sessionData = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      return !!session.userId;
    }
  } catch (error) {
    return false;
  }
  return false;
};

export function UserAuthGuard({ children }) {
  const { user, isUserLoading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location?.pathname ?? "";
  const redirectTimeoutRef = useRef(null);
  const hasRedirectedRef = useRef(false);
  const isDashboardRoute = pathname?.startsWith("/dashboard") ?? false;

  useEffect(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    const sessionExists = hasSession();
    if (sessionExists) {
      hasRedirectedRef.current = false;
      return;
    }

    if (user) {
      hasRedirectedRef.current = false;
      return;
    }

    if (!isUserLoading && !user && !sessionExists && !hasRedirectedRef.current) {
      const delay = isDashboardRoute ? 500 : 200;

      redirectTimeoutRef.current = setTimeout(() => {
        const finalSessionCheck = hasSession();
        if (!finalSessionCheck && !user) {
          hasRedirectedRef.current = true;
          navigate("/login", { replace: true });
        } else {
          hasRedirectedRef.current = false;
        }
      }, delay);
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [user, isUserLoading, navigate, isDashboardRoute]);

  if (user) {
    return <>{children}</>;
  }

  if (hasSession()) {
    return <>{children}</>;
  }

  if (isUserLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user && !isUserLoading && !hasSession()) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
