// Development: Vite proxy forwards /api to backend. Production: set VITE_API_URL
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000');
