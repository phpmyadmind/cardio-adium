import { z } from "zod";

/**
 * Schema para login de usuario
 * Permite login con correo O número de identificación
 * Sin contraseña requerida
 */
export const userLoginSchema = z.object({
  identifier: z.string().min(1, { 
    message: "Por favor ingrese un correo electrónico o número de identificación." 
  }),
  terms: z.boolean().refine(val => val === true, { 
    message: "Debe aceptar los términos y condiciones para iniciar sesión." 
  }),
});

export type UserLoginFormValues = z.infer<typeof userLoginSchema>;

/**
 * Schema para login de administrador
 * Requiere correo electrónico y contraseña
 * Debe aceptar términos y condiciones
 */
export const adminLoginSchema = z.object({
  identifier: z.string().email({ 
    message: "Por favor ingrese un correo electrónico válido." 
  }),
  password: z.string().min(1, { 
    message: "La contraseña es requerida." 
  }),
  terms: z.boolean().refine(val => val === true, { 
    message: "Debe aceptar los términos y condiciones para poder iniciar sesión." 
  }),
});

export type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

/**
 * Valida si un string es un email
 */
export function isEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

/**
 * Valida si un string es un número de identificación
 * (solo números, mínimo 7 dígitos)
 */
export function isMedicalId(str: string): boolean {
  const medicalIdRegex = /^\d{7,}$/;
  return medicalIdRegex.test(str.trim());
}

