'use client';

import { useState, useEffect } from 'react';

export interface UseMongoDocResult<T> {
  data: (T & { id: string }) | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook para obtener un documento de MongoDB a través de API routes
 * @param endpoint - Endpoint de la API (ej: '/api/users?userId=123')
 * @param enabled - Si es false, no hace la petición
 */
export function useMongoDoc<T = any>(
  endpoint: string | null,
  enabled: boolean = true
): UseMongoDocResult<T> {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!endpoint || !enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            setIsLoading(false);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al obtener datos');
        }
        return response.json();
      })
      .then((result) => {
        setData(result);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
        setIsLoading(false);
      });
  }, [endpoint, enabled]);

  return { data, isLoading, error };
}

