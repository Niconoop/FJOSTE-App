const getBackendUrl = () => {
  const envUrl = (import.meta as any)?.env?.VITE_BACKEND_URL;
  if (envUrl) return envUrl;
  return 'https://open-pipe-club-backend.nicohertling09.workers.dev';
};

export const API_BASE_URL = getBackendUrl();
export const API_URL = `${API_BASE_URL}/api`;

export const getAvatarUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
};