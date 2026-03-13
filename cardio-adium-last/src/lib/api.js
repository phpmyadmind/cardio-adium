const API_URL = process.env.REACT_APP_API_URL || '';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
}

/**
 * Parsea la respuesta de forma segura. Si el servidor devuelve HTML en lugar de JSON
 * (ej: backend apagado, URL incorrecta, página de error), evita el error
 * "Unexpected token '<', "<!DOCTYPE "... is not valid JSON".
 */
export async function parseJsonResponse(response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('<') && trimmed.toLowerCase().includes('<!doctype')) {
    const hint = !API_URL
      ? 'REACT_APP_API_URL no está configurada. Verifica tu archivo .env'
      : `El servidor en ${API_URL} devolvió HTML en lugar de JSON. ¿Está el backend corriendo?`;
    throw new Error(`Respuesta inválida del servidor: se esperaba JSON pero se recibió HTML. ${hint}`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Respuesta inválida del servidor: no es JSON válido. ${e.message}`);
  }
}

export async function apiFetch(path, options = {}) {
  const url = getApiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}
