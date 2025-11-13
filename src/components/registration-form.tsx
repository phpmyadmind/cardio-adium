"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/contexts/auth.context";
import { createUser } from "@/services/auth.service";

const registrationSchema = z.object({
  name: z.string().min(8, { message: "El nombre debe tener al menos 8 caracteres." }),
  email: z.string().email({ message: "Por favor ingrese un correo válido." }),
  medicalId: z.string().min(7, { message: "La cédula debe tener al menos 7 Números." }),
  city: z.string().min(2, { message: "La ciudad es requerida." }),
  specialty: z.string().min(3, { message: "La especialidad es requerida." }),
  terms: z.boolean().refine(val => val === true, { message: "Debe aceptar los términos para continuar." }),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;


export function RegistrationForm() {
  const router = useRouter();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      medicalId: "",
      city: "",
      specialty: "",
      terms: false,
    },
  });

  async function onSubmit(data: RegistrationFormValues) {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await createUser({
        name: data.name,
        email: data.email,
        medicalId: data.medicalId,
        city: data.city,
        specialty: data.specialty,
        termsAccepted: data.terms,
        isAdmin: false,
      });

      if (result.success && result.user) {
        // Iniciar sesión automáticamente después del registro
        login(result.user);
        
        setRegistrationSuccess(true);
        
        toast({
          title: "¡Registro Exitoso!",
          description: `Bienvenido, ${data.name}! Ya estás registrado.`,
        });

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const errorMessage = result.error || "Error al registrar usuario.";
        setFormError(errorMessage);
        toast({
          title: "Error de Registro",
          description: errorMessage,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      const errorMessage = error.message || "Ocurrió un error inesperado durante el registro.";
      setFormError(errorMessage);
      toast({
        title: "Error de Registro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registrationSuccess) {
    return (
        <Alert className="border-green-500 text-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">¡Registro Exitoso!</AlertTitle>
            <AlertDescription>
              Ya estás registrado. Redirigiendo al dashboard...
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Registro Button at top */}
          <Button 
            type="button"
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#FD0233] hover:bg-[#FD0233] text-white shadow-md mb-6"           
          >
            Registro
          </Button>

          {formError && (
               <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
              </Alert>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Nombre Completo<span className="text-[#FD0233]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese su nombre completo" 
                      className="border-gray-300 focus:border-[#2E61FA] focus:ring-[#4267B2]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Cédula<span className="text-[#FD0233]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese su cédula" 
                      className="border-gray-300 focus:border-[#2E61FA] focus:ring-[#4267B2]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Ciudad<span className="text-[#FD0233]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese su ciudad" 
                      className="border-gray-300 focus:border-[#2E61FA] focus:ring-[#4267B2]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Especialidad<span className="text-[#FD0233]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ingrese su especialidad" 
                      className="border-gray-300 focus:border-[#2E61FA] focus:ring-[#4267B2]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">
                    Correo Electrónico<span className="text-[#FD0233]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Ingrese su correo electrónico" 
                      className="border-gray-300 focus:border-[#2E61FA] focus:ring-[#4267B2]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          {/* Required fields note */}
          <p className="text-sm text-[#F00808]">*Campos obligatorios</p>

          {/* Terms Checkbox */}
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-[#2E61FA] data-[state=checked]:bg-[#4267B2]"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-gray-700 font-normal cursor-pointer">
                    Acepto el tratamiento de datos personales.
                  </FormLabel>
                  <p className="text-sm text-[#FD0233]">
                    He leído y acepto la{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline font-medium"
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

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-16 sm:h-20 text-lg sm:text-xl font-bold rounded-xl bg-[#2E61FA] hover:bg-[#365899] text-white shadow-md"
          >
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
