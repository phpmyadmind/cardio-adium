'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseMongoCollectionResult<T> {
  data: (T & { id: string })[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook para obtener una colección de MongoDB a través de API routes
 * @param endpoint - Endpoint de la API (ej: '/api/events')
 * @param enabled - Si es false, no hace la petición
 * @param refreshInterval - Intervalo en ms para refrescar los datos (opcional)
 */
export function useMongoCollection<T = any>(
  endpoint: string | null,
  enabled: boolean = true,
  refreshInterval?: number
): UseMongoCollectionResult<T> {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener datos');
      }
      
      const result = await response.json();
      // Asegurar que result sea un array
      const arrayResult = Array.isArray(result) ? result : [result];
      setData(arrayResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    fetchData();

    // Si hay refreshInterval, configurar polling
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, isLoading, error, refetch: fetchData };
}

