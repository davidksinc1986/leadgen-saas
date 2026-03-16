import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const baseURL = import.meta.env.VITE_API_BASE_URL || runtimeOrigin;

export const api = axios.create({ baseURL });

function withApiPrefix(url: string) {
  if (!url.startsWith("/")) return `/api/${url}`;
  if (url.startsWith("/api/")) return url;
  return `/api${url}`;
}

type RetryableConfig = InternalAxiosRequestConfig & { _apiPrefixRetried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status as number | undefined;
    const config = error?.config as RetryableConfig | undefined;
    const url = config?.url;

    if (!config || !url || config._apiPrefixRetried || url.startsWith("/api/") || (status !== 404 && status !== 405)) {
      return Promise.reject(error);
    }

    config._apiPrefixRetried = true;
    config.url = withApiPrefix(url);
    return api.request(config);
  }
);

export async function postWithApiPrefixFallback<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return api.post<T>(url, data, config);
}

export function setAuth(token: string | null, companyId: string | null) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];

  if (companyId) api.defaults.headers.common["X-Company-Id"] = companyId;
  else delete api.defaults.headers.common["X-Company-Id"];
}
