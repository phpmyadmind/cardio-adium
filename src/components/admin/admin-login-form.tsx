"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuthContext } from "@/contexts/auth.context";
import { adminLoginSchema, type AdminLoginFormValues } from "@/lib/auth-schemas";
import { authenticateAdmin } from "@/services/auth.service";

export function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      terms: false,
    },
  });

  async function onSubmit(data: AdminLoginFormValues) {
    // Zod ya valida que los términos estén aceptados, pero verificamos por seguridad
    if (!data.terms) {
      setFormError("Debe aceptar los términos y condiciones para poder iniciar sesión.");
      toast({
        title: "Términos y Condiciones",
        description: "Debe aceptar los términos y condiciones para poder iniciar sesión.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    
    try {
      const result = await authenticateAdmin(data.identifier, data.password);
      
      if (result.success && result.user) {
        // Verificar que el usuario sea administrador
        if (!result.user.isAdmin) {
          setFormError("Acceso denegado. Se requieren privilegios de administrador.");
          toast({
            title: "Error de Acceso",
            description: "Acceso denegado. Se requieren privilegios de administrador.",
            variant: "destructive",
          });
          return;
        }

        // Iniciar sesión en el contexto
        login(result.user);
        
        toast({
          title: "¡Inicio de Sesión Exitoso!",
          description: "Redirigiendo al panel de administración...",
        });
        
        // Redirigir al panel de administración
        router.push("/admin");
      } else {
        const errorMessage = result.error || "Error al iniciar sesión.";
        setFormError(errorMessage);
        toast({
          title: "Error de Inicio de Sesión",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Ocurrió un error inesperado.";
      setFormError(errorMessage);
      toast({
        title: "Error de Inicio de Sesión",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="admin@ejemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  Acepto los términos y condiciones
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  He leído y acepto la{" "}
                  <a
                    href="/Adium_Colombia_Política_de_Privacidad.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2E61FA] hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de Privacidad
                  </a>
                  .
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
        >
          {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
      </form>
    </Form>
  );
}
