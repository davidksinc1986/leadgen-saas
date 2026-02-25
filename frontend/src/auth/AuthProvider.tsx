import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadAuth, saveAuth } from "../lib/storage";
import type { AuthState } from "../lib/storage";
import { setAuth } from "../lib/api";


type AuthCtx = {
token: string | null;
companyId: string | null;
login: (params: AuthState) => void;
logout: () => void;
};

const Ctx = createContext<AuthCtx | null>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
const [token, setToken] = useState<string | null>();
const [companyId, setCompanyId] = useState<string | null>();

useEffect(() => {
  const saved = loadAuth();
  if (saved) {
    setToken(saved.token);
    setCompanyId(saved.companyId);
    setAuth(saved.token, saved.companyId);
  }
}, []);

const value = useMemo<AuthCtx>(() => ({
  token,
  companyId,
  login: ({ token, companyId }) => {
    setToken(token);
    setCompanyId(companyId);
    saveAuth({ token, companyId });
    setAuth(token, companyId);
  },
  logout: () => {
    setToken(null);
    setCompanyId(null);
    saveAuth(null);
    setAuth(null, null);
  }
}), [token, companyId]);

return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
const ctx = useContext(Ctx);
if (!ctx) throw new Error("useAuth must be used within AuthProvider");
return ctx;
}
