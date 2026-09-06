import { useCallback, useEffect, useState } from 'react';

import { getEventSource } from '@/data/event-repository';
import type { StockholmEvent } from '@/types/event';

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

function useAsync<T>(loader: () => Promise<T>, initial: T): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader]);

  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => run(), [run, reloadToken]);

  return { data, loading, error, reload };
}

export function useEvents() {
  const loader = useCallback(() => getEventSource().list(), []);
  return useAsync<StockholmEvent[]>(loader, []);
}

export function useEvent(id: string | undefined) {
  const loader = useCallback(
    () => (id ? getEventSource().getById(id) : Promise.resolve(null)),
    [id],
  );
  return useAsync<StockholmEvent | null>(loader, null);
}
