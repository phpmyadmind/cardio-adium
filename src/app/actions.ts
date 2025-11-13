"use server";

import { z } from "zod";

const registrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  medicalId: z.string().min(5, { message: "Medical ID must be at least 5 characters." }),
  city: z.string().min(2, { message: "City is required." }),
  specialty: z.string().min(3, { message: "Specialty is required." }),
  terms: z.boolean().refine(val => val === true, { message: "You must accept the terms." }),
});

export async function registerUser(prevState: any, formData: FormData) {
  const validatedFields = registrationSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  // This part of the code is not used anymore as registration is handled on the client-side with Firebase.
  // We keep it here as a reference or for potential future use if we switch back to server actions.

  return {
    message: "This action is not in use.",
    errors: {},
  };
}
