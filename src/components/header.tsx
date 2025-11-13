"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoHead } from "./logo";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { UserCircle, LogOut, User, Settings } from "lucide-react";
import { useAuthContext } from "@/contexts/auth.context";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    // Redirigir según el tipo de usuario
    if (user?.isAdmin) {
      router.push("/admin/login");
    } else {
      router.push("/login");
    }
  };

  const handleProfile = () => {
    if (user?.isAdmin) {
      router.push("/admin/profile");
    } else {
      router.push("/dashboard/profile");
    }
  };

  const handleSettings = () => {
    if (user?.isAdmin) {
      router.push("/admin/settings");
    } else {
      router.push("/dashboard/settings");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center">
        <div className="mr-auto flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <LogoHead className="w-[88px] h-[88px]" />
          </Link>
        </div>
        <nav className="items-center space-x-2 hidden md:flex">
          {user?.isAdmin ? (
            <Button variant="ghost" asChild>
              <Link href="/admin">Admin Panel</Link>
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </nav>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-4 h-9 w-9 rounded-full">
                <UserCircle className="h-6 w-6" />
                <span className="sr-only">User Profile</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.name || user.email}
                {user.isAdmin && (
                  <span className="ml-2 text-xs text-muted-foreground">(Admin)</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfile}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
