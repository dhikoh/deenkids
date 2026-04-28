"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, Megaphone } from "lucide-react";
import { fetchAnnouncement } from "@/lib/api";

const typeStyles: Record<string, { bg: string; icon: any }> = {
  info: { bg: "bg-sky-600", icon: <Info size={16} /> },
  warning: { bg: "bg-amber-500", icon: <AlertTriangle size={16} /> },
  promo: { bg: "bg-gradient-to-r from-emerald-500 to-teal-500", icon: <Megaphone size={16} /> },
};

export default function AnnouncementBanner() {
  const [data, setData] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("announcement_dismissed")) return;
    fetchAnnouncement().then(d => { if (d.enabled && d.text) setData(d); }).catch(() => {});
  }, []);

  if (!data || dismissed) return null;

  const style = typeStyles[data.type] || typeStyles.info;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("announcement_dismissed", "true");
  };

  return (
    <div className={`${style.bg} text-white text-center text-sm font-semibold py-2.5 px-4 relative z-[60]`}>
      <div className="container mx-auto flex items-center justify-center gap-2">
        {style.icon}
        <span>{data.text}</span>
        {data.link && <a href={data.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-bold ml-1 hover:opacity-80">Selengkapnya →</a>}
      </div>
      <button onClick={handleDismiss} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"><X size={16} /></button>
    </div>
  );
}
