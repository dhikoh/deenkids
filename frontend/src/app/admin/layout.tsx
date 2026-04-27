"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PenLine, CheckCircle, Settings, Users, LogOut, ChevronLeft } from "lucide-react";
import Cookies from "js-cookie";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);

  useEffect(() => {
    // Read user from local storage
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove('access_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Dynamic menu based on role
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdminOrSuper = isSuperAdmin || user?.role === 'ADMIN';

  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/admin", show: true },
    { name: "Tulis Konten", icon: <PenLine size={20} />, href: "/admin/editor", show: true },
    // Only Admin & SuperAdmin can review
    { name: "Review Konten", icon: <CheckCircle size={20} />, href: "/admin/review", show: isAdminOrSuper },
    // Only SuperAdmin
    { name: "Manajemen User", icon: <Users size={20} />, href: "/admin/users", show: isSuperAdmin },
    { name: "Pengaturan", icon: <Settings size={20} />, href: "/admin/settings", show: isSuperAdmin },
  ].filter(m => m.show);

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Floating Sidebar */}
      <aside className="w-64 my-4 ml-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col transition-all duration-300 z-20 overflow-hidden">
        <div className="h-20 flex items-center justify-center border-b border-slate-50">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-1.5 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-extrabold text-slate-800 text-xl tracking-tight">Deen<span className="text-emerald-500">Kids</span></span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Utama</p>
          {menu.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-bold shadow-sm border border-emerald-100/50"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"
                }`}
              >
                <div className={`${isActive ? "text-emerald-600" : "text-slate-400"}`}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-50 bg-slate-50/50 mt-auto">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-600 hover:bg-white hover:text-slate-800 font-medium transition-all mb-2 hover:shadow-sm">
            <ChevronLeft size={20} className="text-slate-400" />
            Halaman Publik
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-medium transition-all"
          >
            <LogOut size={20} className="text-rose-400" />
            Keluar Akses
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-24 flex items-center justify-between px-8 z-10">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Halo, {user?.name?.split(' ')[0] || 'Admin'} 👋</h1>
            <p className="text-sm font-medium text-slate-500">Selamat datang kembali di panel kontrol.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-sm border border-slate-100">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold uppercase shadow-inner">
              {user?.name?.substring(0, 2) || 'DK'}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name || 'Loading...'}</p>
              <div className="inline-flex items-center px-2 py-0.5 mt-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">{user?.role || 'User'}</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="bg-white rounded-3xl min-h-full shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
