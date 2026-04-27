"use client";

import { Users, FileText, Eye, Heart, Activity, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard SuperAdmin</h1>
          <p className="text-slate-500">Ringkasan performa dan metrik DeenKids Platform.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
          <FileText size={18} /> Export Laporan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Views</p>
              <h3 className="text-2xl font-bold text-slate-800">24,592</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <TrendingUp size={16} /> +12.5% dari minggu lalu
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <Heart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Likes</p>
              <h3 className="text-2xl font-bold text-slate-800">8,401</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <TrendingUp size={16} /> +5.2% dari minggu lalu
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Konten Aktif</p>
              <h3 className="text-2xl font-bold text-slate-800">142</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Tersebar di 4 kategori utama
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Editor Aktif</p>
              <h3 className="text-2xl font-bold text-slate-800">5</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Menulis 12 artikel bulan ini
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Review Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-amber-500" /> Menunggu Persetujuan
            </h3>
            <Link href="/admin/review" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">
              Lihat Semua
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { title: "Kisah Sahabat Nabi: Umar bin Khattab", author: "Ahmad", score: 92 },
              { title: "Adab Makan Menurut Sunnah", author: "Fatimah", score: 88 },
            ].map((item, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500">Ditulis oleh {item.author} • 2 jam yang lalu</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">AI Score</p>
                    <p className="font-bold text-emerald-600">{item.score}/100</p>
                  </div>
                  <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-sm transition-colors">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health / AI Status */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Activity className="text-emerald-400" /> Status Sistem
          </h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">AI Validator Service</span>
                <span className="text-emerald-400 font-bold">Online</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Database Load</span>
                <span className="text-amber-400 font-bold">42%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl mt-6">
              <h4 className="font-bold text-sm text-slate-300 mb-2">Server Info (Hostinger / Coolify)</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex justify-between"><span>Uptime</span> <span className="text-slate-200">99.98%</span></li>
                <li className="flex justify-between"><span>Node.js</span> <span className="text-slate-200">v20.x</span></li>
                <li className="flex justify-between"><span>PostgreSQL</span> <span className="text-slate-200">Connected</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
