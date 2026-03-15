import React, { createContext, useContext, useMemo, useState } from "react";
import { localeLabels, translations, type Locale } from "./translations";

type I18nCtx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  localeLabels: Record<Locale, string>;
};

const STORAGE_KEY = "leadgen:locale";
const Ctx = createContext<I18nCtx | null>(null);

function getInitialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && saved in translations) return saved;
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translations[locale][key] ?? translations.en[key] ?? key,
      localeLabels
    }),
    [locale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
