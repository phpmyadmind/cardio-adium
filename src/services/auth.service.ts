/**
 * Servicio de autenticación basado en MongoDB
 * Utiliza API routes para interactuar con la base de datos
 */

import { isEmail, isMedicalId } from "@/lib/auth-schemas";

export interface UserProfile {
  id: string;
  email: string;
  medicalId: string;
  name: string;
  city?: string;
  specialty?: string;
  isAdmin?: boolean;
  password?: string; // Contraseña encriptada para admins
  createdAt?: any;
  updatedAt?: any;
  lastLogin?: any;
  termsAccepted?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

/**
 * Busca un usuario en MongoDB por email o número de identificación
 */
export async function findUserByIdentifier(
  identifier: string
): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/users?identifier=${encodeURIComponent(identifier)}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Error al buscar usuario');
    }
    
    const user = await response.json();
    return user as UserProfile;
  } catch (error) {
    console.error("Error buscando usuario:", error);
    return null;
  }
}

// Las funciones de hash y verificación de contraseña ahora se manejan en el servidor

/**
 * Autentica un usuario normal (sin contraseña)
 * Busca por email o número de identificación
 */
export async function authenticateUser(
  identifier: string
): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, isAdmin: false }),
    });
    
    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al autenticar usuario."
    };
  }
}

/**
 * Autentica un administrador (con contraseña)
 * Busca por email o número de identificación
 * Valida contraseña y rol admin
 */
export async function authenticateAdmin(
  identifier: string,
  password: string
): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password, isAdmin: true }),
    });
    
    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al autenticar administrador."
    };
  }
}

/**
 * Obtiene el perfil de usuario desde MongoDB
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/users?userId=${encodeURIComponent(userId)}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Error al obtener perfil de usuario');
    }
    
    const user = await response.json();
    return user as UserProfile;
  } catch (error) {
    console.error("Error obteniendo perfil de usuario:", error);
    return null;
  }
}

/**
 * Verifica si el usuario actual es administrador
 */
export async function isAdminUser(
  userId: string
): Promise<boolean> {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.isAdmin === true;
  } catch (error) {
    console.error("Error verificando rol de administrador:", error);
    return false;
  }
}

/**
 * Crea un nuevo usuario en MongoDB
 */
export async function createUser(
  userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AuthResult> {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || "Error al crear usuario."
      };
    }
    
    const user = await response.json();
    
    return {
      success: true,
      user: user as UserProfile
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al crear usuario."
    };
  }
}

