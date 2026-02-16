const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000');

function getToken(): string {
  return localStorage.getItem('token')?.trim() || '';
}

export function getSelectedStoreId(): string | null {
  return sessionStorage.getItem('selectedStoreId');
}

export function apiUrl(path: string, params?: Record<string, string>): string {
  const token = getToken();
  const base = API_BASE || window.location.origin;
  const url = new URL(path.startsWith('http') ? path : path.startsWith('/') ? base + path : base + '/' + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const storeId = getSelectedStoreId();
  if (storeId && !url.searchParams.has('store_id')) url.searchParams.set('store_id', storeId);
  if (token) url.searchParams.set('token', token);
  return url.origin === window.location.origin ? url.pathname + url.search : url.href;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const url = apiUrl(path);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
