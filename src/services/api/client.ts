import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@stores/authStore';

/**
 * The single HTTP client for the whole app. Talks to the Nirmanam backend
 * (`VITE_API_BASE_URL`). Every request carries the JWT from the auth store;
 * every response is unwrapped from the backend envelope `{ success, data, ... }`.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4300/api';

export const http = axios.create({ baseURL, timeout: 20_000 });

// Attach the bearer token (and a client-type hint) to every request.
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-client-type'] = 'web';
  return config;
});

// Normalize errors; auto-logout on 401 (except during the login handshake).
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url: string = err.config?.url || '';
    if (status === 401 && !url.includes('/auth/otp') && !url.includes('/auth/verify')) {
      useAuthStore.getState().logout();
    }
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

/** GET → returns the envelope's `data`. */
export async function apiGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get(url, config);
  return res.data?.data as T;
}
export async function apiPost<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post(url, body, config);
  return res.data?.data as T;
}
export async function apiPut<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put(url, body, config);
  return res.data?.data as T;
}
export async function apiPatch<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.patch(url, body, config);
  return res.data?.data as T;
}
export async function apiDelete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete(url, config);
  return res.data?.data as T;
}
