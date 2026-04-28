"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { id as idLang } from "./id";
import { en as enLang } from "./en";

const dictionaries: Record<string, Record<string, any>> = { id: idLang, en: enLang };

type I18nContextType = { locale: string; setLocale: (l: string) => void; t: (key: string) => string };

const I18nContext = createContext<I18nContextType>({ locale: "id", setLocale: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("id");

  useEffect(() => {
    const saved = localStorage.getItem("locale") || "id";
    setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const t = useCallback((key: string): string => {
    const parts = key.split(".");
    let val: any = dictionaries[locale] || dictionaries.id;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) break;
    }
    return typeof val === "string" ? val : key;
  }, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}

// Detect Arabic script (for skipping translation)
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

// Generate Google Translate URL
export function googleTranslateUrl(text: string, targetLang = "en"): string {
  return `https://translate.google.com/?sl=id&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
}
