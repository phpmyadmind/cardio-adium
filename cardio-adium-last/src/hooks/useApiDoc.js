import { useState, useEffect } from 'react';
import { getApiUrl, parseJsonResponse } from '../lib/api';

export function useApiDoc(endpoint, enabled = true) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!endpoint || !enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetch(getApiUrl(endpoint))
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            setIsLoading(false);
            return;
          }
          const errorData = await parseJsonResponse(response).catch(() => ({}));
          throw new Error(errorData.error || 'Error al obtener datos');
        }
        return parseJsonResponse(response);
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
