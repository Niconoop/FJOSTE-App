// Open Pipe Club App - Lightweight Local SWR Cache Utility

const CACHE_PREFIX = "opc_app_cache_";

export function getCachedData<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    return parsed.data as T;
  } catch (e) {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (e) {}
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<any>,
  onUpdate?: (data: T) => void
): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached && typeof onUpdate === "function") {
    onUpdate(cached);
  }

  try {
    const fresh = await fetcher();
    const data = (fresh?.data !== undefined ? fresh.data : fresh) as T;
    setCachedData(key, data);
    if (typeof onUpdate === "function") {
      onUpdate(data);
    }
    return data;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}
