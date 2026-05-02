"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PenLine, CheckCircle, Settings, Users, LogOut, ChevronLeft, FileText, FolderTree, Gift, Bell, MessageSquare, DollarSign, Trophy, Wallet, UserCircle, Menu, X, Database, Wand2, Image, AlertTriangle, Trash2 } from "lucide-react";
import Cookies from "js-cookie";
import { API_BASE_URL } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{name: string, role: string, email: string, id?: string} | null>(null);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const token = Cookies.get('_at');
    if (!token) return;

    let active = true;
    const poll = async () => {
      // Pause polling when tab is not visible
      if (document.visibilityState === 'hidden') return;

      try {
        const notifRes = await fetch(`${API_BASE_URL}/admin/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        if (notifRes.status === 401) { handleLogout(); return; }
        if (notifRes.ok) { const r = await notifRes.json(); if (active) setUnreadNotif(r.count || 0); }
      } catch {}
      try {
        const msgRes = await fetch(`${API_BASE_URL}/admin/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        if (msgRes.status === 401) { handleLogout(); return; }
        if (msgRes.ok) { const r = await msgRes.json(); if (active) setUnreadMsg(r.count || 0); }
      } catch {}
      // Error report count (SuperAdmin only)
      try {
        const errRes = await fetch(`${API_BASE_URL}/admin/error-reports/stats`, { headers: { Authorization: `Bearer ${token}` } });
        if (errRes.ok) { const r = await errRes.json(); if (active) setErrorCount(r.unresolved || 0); }
      } catch {}
    };

    // Poll on tab becoming visible again
    const handleVisibility = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', handleVisibility);

    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const token = Cookies.get('_at');
      const rt = Cookies.get('_rt');
      if (token) {
        // Revoke refresh token in backend database
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: rt || '' }),
        }).catch(() => {});
      }
    } finally {
      Cookies.remove('_at', { path: '/' });
      Cookies.remove('_rt', { path: '/' });
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdminOrSuper = isSuperAdmin || user?.role === 'ADMIN';

  const menuSections = [
    { label: "Menu Utama", items: [
      { name: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/admin", show: true },
      { name: "Tulis Konten", icon: <PenLine size={20} />, href: "/admin/editor", show: true },
      { name: "Konten Saya", icon: <FileText size={20} />, href: "/admin/my-contents", show: true },
      { name: "Inbox", icon: <Bell size={20} />, href: "/admin/inbox", show: true, badge: unreadNotif },
      { name: "Pesan", icon: <MessageSquare size={20} />, href: "/admin/messages", show: true, badge: unreadMsg },
      { name: "Reward Poin", icon: <Trophy size={20} />, href: "/admin/rewards", show: true },
      { name: "Profil", icon: <UserCircle size={20} />, href: "/admin/profile", show: true },
      { name: "Tempat Sampah", icon: <Trash2 size={20} />, href: "/admin/trash", show: true },
    ]},
    { label: "Kelola", items: [
      { name: "Review Konten", icon: <CheckCircle size={20} />, href: "/admin/review", show: isAdminOrSuper },
      { name: "Kelola Konten", icon: <FileText size={20} />, href: "/admin/content-management", show: isAdminOrSuper },
      { name: "Kelola Struktur", icon: <FolderTree size={20} />, href: "/admin/structure", show: isAdminOrSuper },
      { name: "Manajemen User", icon: <Users size={20} />, href: "/admin/users", show: isAdminOrSuper },
    ]},
    { label: "SuperAdmin", items: [
      { name: "Prompt Generator", icon: <Wand2 size={20} />, href: "/admin/prompt-generator", show: isSuperAdmin },
      { name: "Tentang Kami", icon: <FileText size={20} />, href: "/admin/about-editor", show: isSuperAdmin },
      { name: "Kontak CS", icon: <MessageSquare size={20} />, href: "/admin/contact-editor", show: isSuperAdmin },
      { name: "Donasi Masuk", icon: <DollarSign size={20} />, href: "/admin/donation-inbox", show: isSuperAdmin },
      { name: "Kritik & Saran", icon: <MessageSquare size={20} />, href: "/admin/feedback", show: isSuperAdmin },
      { name: "Withdrawal", icon: <Wallet size={20} />, href: "/admin/withdrawal-inbox", show: isSuperAdmin },
      { name: "Donasi Settings", icon: <Gift size={20} />, href: "/admin/donation", show: isSuperAdmin },
      { name: "Banner & Iklan", icon: <Image size={20} />, href: "/admin/banners", show: isSuperAdmin },
      { name: "Error Reports", icon: <AlertTriangle size={20} />, href: "/admin/error-reports", show: isSuperAdmin, badge: errorCount },
      { name: "Pengaturan", icon: <Settings size={20} />, href: "/admin/settings", show: isSuperAdmin },
      { name: "Backup & Export", icon: <Database size={20} />, href: "/admin/settings#backup", show: isSuperAdmin },
    ]},
  ];

  const SidebarContent = () => (
    <>
      <div className="h-20 flex items-center justify-center border-b border-slate-50">
        <Link href="/" className="flex items-center gap-2 group" onClick={() => setSidebarOpen(false)}>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-1.5 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <LayoutDashboard size={20} />
          </div>
          <span className="font-extrabold text-slate-800 text-xl tracking-tight">Adab<span className="text-emerald-500">ly</span></span>
        </Link>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-3 overflow-y-auto">
        {menuSections.map(section => {
          const visible = section.items.filter(m => m.show);
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="px-4 pt-4 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{section.label}</p>
              {visible.map((item: any) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isActive ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-100/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"}`}>
                    <div className={`${isActive ? "text-emerald-600" : "text-slate-400"}`}>{item.icon}</div>
                    <span className="flex-1">{item.name}</span>
                    {item.badge > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge > 99 ? '99+' : item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-50 bg-slate-50/50 mt-auto">
        <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-white hover:text-slate-800 font-medium transition-all mb-1 text-sm">
          <ChevronLeft size={18} className="text-slate-400" /> Halaman Publik
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-medium transition-all text-sm">
          <LogOut size={18} className="text-rose-400" /> Keluar Akses
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className="hidden md:flex w-60 my-4 ml-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-col z-20 overflow-hidden">
        <SidebarContent />
      </aside>
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col z-40 transform transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400"><X size={20} /></button>
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu size={22} /></button>
            <div>
              <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">Halo, {user?.name?.split(' ')[0] || 'Admin'} 👋</h1>
              <p className="text-xs md:text-sm font-medium text-slate-500 hidden md:block">Selamat datang kembali di panel kontrol.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/admin/inbox" className="relative p-2 rounded-full hover:bg-emerald-50">
              <Bell size={20} className="text-slate-500" />
              {unreadNotif > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unreadNotif > 9 ? '9+' : unreadNotif}</span>}
            </Link>
            <Link href="/admin/messages" className="relative p-2 rounded-full hover:bg-emerald-50">
              <MessageSquare size={20} className="text-slate-500" />
              {unreadMsg > 0 && <span className="absolute -top-0.5 -right-0.5 bg-sky-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unreadMsg > 9 ? '9+' : unreadMsg}</span>}
            </Link>
            <Link href="/admin/profile" className="flex items-center gap-2 bg-white p-1.5 pr-3 rounded-full shadow-sm border border-slate-100">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold uppercase text-xs shadow-inner">{user?.name?.substring(0, 2) || 'AD'}</div>
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || '...'}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase">{user?.role}</p>
              </div>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto px-4 md:px-8 pb-4 md:pb-8">
          <div className="bg-white rounded-2xl md:rounded-3xl min-h-full shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
