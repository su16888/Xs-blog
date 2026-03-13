/**
 * @file useApiCache.ts
 * @description API 请求缓存 Hook，避免重复请求
 */

import { useEffect, useRef, useState } from 'react';

// 全局缓存
const globalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 缓存 5 秒

interface UseApiCacheOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  cacheDuration?: number;
  enabled?: boolean;
}

export function useApiCache<T>({
  key,
  fetcher,
  cacheDuration = CACHE_DURATION,
  enabled = true,
}: UseApiCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;

    const fetchData = async () => {
      // 检查缓存
      const cached = globalCache.get(key);
      const now = Date.now();

      if (cached && now - cached.timestamp < cacheDuration) {
        if (isMountedRef.current) {
          setData(cached.data);
          setLoading(false);
        }
        return;
      }

      // 发起请求
      try {
        const result = await fetcher();

        // 更新缓存
        globalCache.set(key, { data: result, timestamp: now });

        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [key, fetcher, cacheDuration, enabled]);

  return { data, loading, error };
}

// 清除指定缓存
export function clearCache(key: string) {
  globalCache.delete(key);
}

// 清除所有缓存
export function clearAllCache() {
  globalCache.clear();
}
