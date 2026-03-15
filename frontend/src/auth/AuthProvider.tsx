import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadAuth, saveAuth } from "../lib/storage";
import type { AuthRole, AuthState } from "../lib/storage";
import { setAuth } from "../lib/api";

type LoginParams = Pick<AuthState, "token" | "companyId"> & { role?: AuthRole | null };

type AuthCtx = {
  token: string | null;
  companyId: string | null;
  role: AuthRole | null;
  login: (params: LoginParams) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

function getRoleFromToken(token: string): AuthRole | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const payload = JSON.parse(atob(payloadBase64));
    const role = payload?.role;
    if (["super_admin", "company_admin", "admin", "agent"].includes(role)) {
      return role as AuthRole;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<AuthRole | null>(null);

  useEffect(() => {
    const saved = loadAuth();
    if (saved) {
      setToken(saved.token);
      setCompanyId(saved.companyId);
      setRole(saved.role ?? getRoleFromToken(saved.token));
      setAuth(saved.token, saved.companyId);
    }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      token,
      companyId,
      role,
      login: ({ token, companyId, role }) => {
        const nextRole = role ?? getRoleFromToken(token);
        if (!nextRole) {
          throw new Error("Unable to detect user role from token");
        }
        setToken(token);
        setCompanyId(companyId);
        setRole(nextRole);
        saveAuth({ token, companyId, role: nextRole });
        setAuth(token, companyId);
      },
      logout: () => {
        setToken(null);
        setCompanyId(null);
        setRole(null);
        saveAuth(null);
        setAuth(null, null);
      }
    }),
    [token, companyId, role]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
