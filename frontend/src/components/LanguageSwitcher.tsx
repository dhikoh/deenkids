"use client";
import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  return (
    <button
      onClick={() => setLocale(locale === "id" ? "en" : "id")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-slate-200 text-sm font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all"
      title={locale === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
    >
      <Globe size={14} />
      {locale === "id" ? "EN" : "ID"}
    </button>
  );
}
