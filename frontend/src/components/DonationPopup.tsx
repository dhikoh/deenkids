"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Gift, CreditCard, QrCode, ExternalLink } from "lucide-react";
import { fetchDonationSettings } from "@/lib/api";

const iconMap: Record<string, any> = {
  bank: <CreditCard size={18} className="text-emerald-600" />,
  qris: <QrCode size={18} className="text-sky-600" />,
  saweria: <Gift size={18} className="text-amber-600" />,
  other: <ExternalLink size={18} className="text-slate-600" />,
};

export default function DonationPopup() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<any>(null);
  const pathname = usePathname();

  // Only show for public visitors, not in admin panel or login
  const isPublicPage = !pathname.startsWith('/admin') && !pathname.startsWith('/login');

  useEffect(() => {
    if (!isPublicPage) return;
    const dismissed = sessionStorage.getItem("donation_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => {
      fetchDonationSettings()
        .then(d => {
          if (d.enabled) { setData(d); setShow(true); }
        })
        .catch(() => {});
    }, 20000); // Show after 20 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!show || !data) return null;

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem("donation_dismissed", "true");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeInUp" onClick={e => e.stopPropagation()}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white text-center relative">
          <button onClick={handleClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={20} /></button>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Gift size={32} />
          </div>
          <h3 className="text-xl font-extrabold">{data.title}</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-center text-sm leading-relaxed">{data.message}</p>

          <div className="space-y-2">
            {data.methods?.map((method: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                {iconMap[method.type] || iconMap.other}
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{method.label}</p>
                  {method.type === "bank" ? (
                    <p className="text-xs text-slate-500 font-mono">{method.value}</p>
                  ) : (
                    <a href={method.value} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">{method.value}</a>
                  )}
                </div>
                {method.type === "bank" && (
                  <button onClick={() => { navigator.clipboard.writeText(method.value); }} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-bold hover:bg-emerald-200">Salin</button>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400">Jazaakumullaahu khairan atas dukungannya 🤲</p>
        </div>
      </div>
    </div>
  );
}
