import { useState, useEffect, useCallback } from 'react';
import { getApiUrl, parseJsonResponse } from '../lib/api';

export function useApiCollection(endpoint, enabled = true, refreshInterval) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const response = await fetch(getApiUrl(endpoint));
      if (!response.ok) {
        const errorData = await parseJsonResponse(response).catch(() => ({}));
        throw new Error(errorData.error || 'Error al obtener datos');
      }
      const result = await parseJsonResponse(response);
      setData(Array.isArray(result) ? result : result != null ? [result] : []);
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
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return { data, isLoading, error, refetch: fetchData };
}
