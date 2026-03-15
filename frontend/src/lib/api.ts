import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const baseURL = import.meta.env.VITE_API_BASE_URL || runtimeOrigin;

export const api = axios.create({ baseURL });

function withApiPrefix(url: string) {
  if (!url.startsWith("/")) return `/api/${url}`;
  if (url.startsWith("/api/")) return url;
  return `/api${url}`;
}

export async function postWithApiPrefixFallback<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  try {
    return await api.post<T>(url, data, config);
  } catch (error: any) {
    const status = error?.response?.status as number | undefined;
    if ((status === 404 || status === 405) && !url.startsWith("/api/")) {
      return api.post<T>(withApiPrefix(url), data, config);
    }
    throw error;
  }
}

export function setAuth(token: string | null, companyId: string | null) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];

  if (companyId) api.defaults.headers.common["X-Company-Id"] = companyId;
  else delete api.defaults.headers.common["X-Company-Id"];
}
