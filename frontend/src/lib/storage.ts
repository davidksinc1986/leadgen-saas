const KEY = "leadgenchat_auth";

export type AuthRole = "super_admin" | "company_admin" | "admin" | "agent";

export type AuthState = {
  token: string;
  companyId: string;
  role: AuthRole;
};

export function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuth(state: AuthState | null) {
  if (!state) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(state));
}
