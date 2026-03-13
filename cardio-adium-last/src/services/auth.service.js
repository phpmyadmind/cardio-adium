import { getApiUrl } from '../lib/api';

export async function findUserByIdentifier(identifier) {
  try {
    const response = await fetch(getApiUrl(`/api/users?identifier=${encodeURIComponent(identifier)}`));
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Error al buscar usuario');
    return response.json();
  } catch (error) {
    console.error('Error buscando usuario:', error);
    return null;
  }
}

export async function authenticateUser(identifier) {
  try {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, isAdmin: false }),
    });
    return response.json();
  } catch (error) {
    return { success: false, error: error.message || 'Error al autenticar usuario.' };
  }
}

export async function authenticateAdmin(identifier, password) {
  try {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, isAdmin: true }),
    });
    return response.json();
  } catch (error) {
    return { success: false, error: error.message || 'Error al autenticar administrador.' };
  }
}

export async function getUserProfile(userId) {
  try {
    const response = await fetch(getApiUrl(`/api/users?userId=${encodeURIComponent(userId)}`));
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Error al obtener perfil de usuario');
    return response.json();
  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    return null;
  }
}

export async function isAdminUser(userId) {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.isAdmin === true;
  } catch (error) {
    console.error('Error verificando rol de administrador:', error);
    return false;
  }
}

export async function createUser(userData) {
  try {
    const response = await fetch(getApiUrl('/api/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Error al crear usuario.' };
    }
    const user = await response.json();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message || 'Error al crear usuario.' };
  }
}
