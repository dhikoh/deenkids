"use client";

import { useState, useEffect } from "react";
import { fetchAiToggle, updateAiToggle } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Sparkles, Save } from "lucide-react";

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      const data = await fetchAiToggle(token);
      setAiEnabled(data.aiEnabled);
    } catch (error) {
      toast.error("Gagal memuat pengaturan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      await updateAiToggle(aiEnabled, token);
      toast.success("Pengaturan berhasil disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Memuat pengaturan...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Global</h1>
        <p className="text-slate-500">Konfigurasi sistem utama DeenKids.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={20} /> Konfigurasi AI Checker
        </h2>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-semibold text-slate-700">Status AI Checker (OpenAI)</p>
            <p className="text-sm text-slate-500">Jika aktif, AI akan mengecek dalil dan kesesuaian usia setiap konten yang dibuat.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70"
        >
          <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
