"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const DISMISS_KEY = "adably_banner_dismiss";

export default function SponsorBannerPopup() {
  const [banner, setBanner] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed today
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissDate = new Date(dismissed);
      const today = new Date();
      if (dismissDate.toDateString() === today.toDateString()) return;
    }

    // Fetch active banners
    fetch(`${API}/content/banners/active`)
      .then(r => r.json())
      .then(data => {
        const banners = data.data || [];
        if (banners.length > 0) {
          setBanner(banners[0]); // Show highest priority
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleClose = () => {
    setVisible(false);
  };

  const handleDismissToday = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  const handleClick = () => {
    if (!banner) return;
    // Track click
    fetch(`${API}/content/banners/${banner.id}/click`, { method: "POST" }).catch(() => {});
    if (banner.linkUrl) {
      window.open(banner.linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!visible || !banner) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={handleClose}>
      <div className="relative max-w-md w-full mx-4 animate-scaleIn" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={handleClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:scale-110 transition-all z-10">
          <X size={16} />
        </button>

        {/* Banner Image */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
          onClick={handleClick}
        >
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-300" />
        </div>

        {/* Dismiss Today */}
        <div className="flex justify-center mt-3">
          <button
            onClick={handleDismissToday}
            className="text-xs text-white/70 hover:text-white transition-colors underline underline-offset-2"
          >
            Jangan tampilkan hari ini
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
