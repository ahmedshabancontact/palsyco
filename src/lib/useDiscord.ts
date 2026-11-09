import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const store = new Map<string, { data: unknown; t: number }>();

export function useDiscord<T>(type: string, refreshMs = 0) {
  const entry = store.get(type);
  const [data, setData] = useState<T | null>(entry ? (entry.data as T) : null);
  const [loading, setLoading] = useState(!entry);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(entry?.t ?? null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api<T>(`/api/discord?type=${type}`);
      const t = Date.now();
      store.set(type, { data: d, t });
      setData(d);
      setError(null);
      setUpdatedAt(t);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => {
    load();
    if (!refreshMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  return { data, loading, error, refresh: load, updatedAt, refreshing };
}
