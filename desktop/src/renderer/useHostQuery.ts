import { useEffect, useState } from "react";

export function useHostQuery<T>(
  enabled: boolean,
  load: () => Promise<T>,
  identity: string,
  interval = 15_000,
) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: enabled });
  useEffect(() => {
    let active = true;
    setResult({ data: null, error: null, loading: enabled });
    if (!enabled) return;
    const refresh = () => {
      void load()
        .then((data) => {
          if (active) setResult({ data, error: null, loading: false });
        })
        .catch((error) => {
          if (active)
            setResult({ data: null, error: String(error), loading: false });
        });
    };
    refresh();
    const timer = setInterval(refresh, interval);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, load, identity, interval, revision]);
  return { ...result, refresh: () => setRevision((value) => value + 1) };
}
