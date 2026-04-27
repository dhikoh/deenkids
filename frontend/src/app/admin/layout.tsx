"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Edit3, Settings, Users, LogOut, ChevronLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/admin" },
    { name: "Tulis Konten", icon: <Edit3 size={20} />, href: "/admin/editor" },
    { name: "Manajemen User", icon: <Users size={20} />, href: "/admin/users" },
    { name: "Pengaturan", icon: <Settings size={20} />, href: "/admin/settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <span className="font-bold text-white text-lg tracking-wide">DeenKids Panel</span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin')
                  ? "bg-emerald-500 text-white font-medium shadow-md shadow-emerald-500/20"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors mb-2">
            <ChevronLeft size={20} />
            Ke Halaman Utama
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors">
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-800">Admin Utama</p>
              <p className="text-xs text-emerald-600 font-medium">SuperAdmin</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold">
              AU
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
