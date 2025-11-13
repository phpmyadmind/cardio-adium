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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuthContext } from "@/contexts/auth.context";
import { userLoginSchema, type UserLoginFormValues } from "@/lib/auth-schemas";
import { authenticateUser } from "@/services/auth.service";

export function UserLoginForm() {
  const router = useRouter();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<UserLoginFormValues>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      identifier: "",
    },
  });

  async function onSubmit(data: UserLoginFormValues) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await authenticateUser(data.identifier);
      
      if (result.success && result.user) {
        // Iniciar sesión en el contexto
        login(result.user);
        
        toast({
          title: "¡Inicio de sesión exitoso!",
          description: "Redirigiendo al panel...",
        });
        router.push("/dashboard");
      } else {
        const errorMessage = result.error || "Error al iniciar sesión.";
        setFormError(errorMessage);
        toast({
          title: "Error de inicio de sesión",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Ocurrió un error inesperado.";
      setFormError(errorMessage);
      toast({
        title: "Error de inicio de sesión",
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
              <FormLabel className="text-gray-700 font-medium">
                Correo Electrónico o Número de Identificación<span className="text-[#F00808]">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="usuario@ejemplo.com o 1234567890"
                  className="border-gray-300 focus:border-[#4267B2] focus:ring-[#4267B2]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
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

