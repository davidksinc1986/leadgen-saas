import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const api = axios.create({ baseURL });

export function setAuth(token: string | null, companyId: string | null) {
if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
else delete api.defaults.headers.common["Authorization"];

if (companyId) api.defaults.headers.common["X-Company-Id"] = companyId;
else delete api.defaults.headers.common["X-Company-Id"];
}