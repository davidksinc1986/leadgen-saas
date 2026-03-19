import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadAuth, saveAuth } from "../lib/storage";
import type { AuthRole, AuthState } from "../lib/storage";
import { setAuth } from "../lib/api";

type LoginParams = Pick<AuthState, "token"> & { companyId?: string | null; role?: AuthRole | null };

type AuthCtx = {
  token: string | null;
  companyId: string | null;
  role: AuthRole | null;
  login: (params: LoginParams) => void;
  logout: () => void;
};

type TokenPayload = {
  role?: AuthRole;
  companyId?: string | null;
};

const Ctx = createContext<AuthCtx | null>(null);

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getSessionFromToken(token: string) {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  const companyId = typeof payload?.companyId === "string" && payload.companyId.trim() ? payload.companyId : null;

  if (role && ["super_admin", "company_admin", "admin", "agent"].includes(role)) {
    return { role, companyId } as { role: AuthRole; companyId: string | null };
  }

  return { role: null, companyId };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<AuthRole | null>(null);

  useEffect(() => {
    const saved = loadAuth();
    if (saved) {
      const tokenSession = getSessionFromToken(saved.token);
      const nextCompanyId = saved.companyId ?? tokenSession.companyId;
      const nextRole = saved.role ?? tokenSession.role;

      setToken(saved.token);
      setCompanyId(nextCompanyId);
      setRole(nextRole);
      setAuth(saved.token, nextCompanyId);
    }
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      token,
      companyId,
      role,
      login: ({ token, companyId, role }) => {
        const tokenSession = getSessionFromToken(token);
        const nextRole = role ?? tokenSession.role;
        const nextCompanyId = companyId ?? tokenSession.companyId;

        if (!nextRole) {
          throw new Error("Unable to detect user role from token");
        }

        setToken(token);
        setCompanyId(nextCompanyId);
        setRole(nextRole);
        saveAuth({ token, companyId: nextCompanyId, role: nextRole });
        setAuth(token, nextCompanyId);
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
