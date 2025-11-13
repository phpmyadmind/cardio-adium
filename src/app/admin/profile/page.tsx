"use client";

import { Header } from "@/components/header";
import { AuthGuard } from "@/components/admin/auth-guard";
import { useAuthContext } from "@/contexts/auth.context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Shield, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function ProfileDetail({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value || '-'}</p>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const { user, isUserLoading } = useAuthContext();

  if (isUserLoading) {
    return (
      <div className="min-h-screen relative">
        <Header />
        <main className="container mx-auto p-4 sm:p-6 md:p-8">
          <div className="text-center py-8">Cargando perfil...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <AuthGuard>
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold font-headline mb-6 text-primary">
              Mi Perfil
            </h1>
            <Card>
              <CardHeader>
                <CardTitle>Información del Administrador</CardTitle>
                <CardDescription>
                  Detalles de tu cuenta de administrador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProfileDetail
                  icon={User}
                  label="Nombre Completo"
                  value={user?.name}
                />
                <ProfileDetail
                  icon={Mail}
                  label="Correo Electrónico"
                  value={user?.email}
                />
                <ProfileDetail
                  icon={Shield}
                  label="Rol"
                  value={user?.isAdmin ? "Administrador" : "Usuario"}
                />
                {user?.lastLogin && (
                  <ProfileDetail
                    icon={Calendar}
                    label="Último Acceso"
                    value={format(new Date(user.lastLogin), "PPpp", { locale: es })}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </AuthGuard>
      </main>
    </div>
  );
}

