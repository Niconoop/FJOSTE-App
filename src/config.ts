// Set this to true to use the local backend, false for production.
const USE_LOCAL_BACKEND = false; 

export const API_BASE_URL = USE_LOCAL_BACKEND ? 'http://127.0.0.1:8000' : 'https://api.fjostegroup.de';
export const API_URL = `${API_BASE_URL}/api`;

export const getAvatarUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
};
