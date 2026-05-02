"use client";
import Link from "next/link";
import { BookOpen, Heart, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPageContent } from "@/lib/api";

export function Footer() {
  const [contact, setContact] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchPageContent("contact").then(r => setContact(r.data?.content || null)).catch(() => {});
    try {
      const user = localStorage.getItem("user");
      if (user && JSON.parse(user)?.name) setIsLoggedIn(true);
    } catch {}
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl text-white">Adab<span className="text-emerald-400">ly</span></span>
            </Link>
            <p className="text-sm leading-relaxed">
              Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Qur&apos;an, Hadits, dan literatur ulama.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-emerald-400 transition-colors">Beranda</Link></li>
              <li><Link href="/kurikulum" className="hover:text-emerald-400 transition-colors">Pembelajaran</Link></li>
              <li><Link href="/qna" className="hover:text-emerald-400 transition-colors">Tanya Jawab</Link></li>
              <li><Link href="/artikel" className="hover:text-emerald-400 transition-colors">Artikel</Link></li>
              <li><Link href="/tentang-kami" className="hover:text-emerald-400 transition-colors">Tentang Kami</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Kontributor</h4>
            <ul className="space-y-2 text-sm">
              <li>
                {isLoggedIn ? (
                  <Link href="/admin" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
                ) : (
                  <Link href="/login" className="hover:text-emerald-400 transition-colors">Login Panel</Link>
                )}
              </li>
              <li><Link href="/tersimpan" className="hover:text-emerald-400 transition-colors">🔖 Konten Tersimpan</Link></li>
            </ul>
            <p className="text-xs mt-6 text-slate-500">
              Konten disusun oleh kontributor dan telah melalui proses peninjauan tim redaksi. Pembaca dianjurkan merujuk langsung pada sumber asli (Al-Qur&apos;an, Hadits, dan pendapat ulama) untuk memastikan keakuratan.
            </p>
          </div>

          {/* Contact CS */}
          {contact?.isActive && contact?.whatsapp && (
            <div>
              <h4 className="font-bold text-white mb-4">Hubungi Kami</h4>
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(contact.defaultMessage || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <MessageCircle size={16} />
                {contact.displayName || 'CS Adably'}
              </a>
              <p className="text-xs mt-3 text-slate-500">Senin–Jumat, 08:00–17:00 WIB</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Adably. Hak cipta dilindungi.</p>
          <p className="flex items-center gap-1">Dibuat dengan <Heart className="h-3 w-3 text-rose-400 fill-rose-400" /> untuk generasi Muslim.</p>
        </div>
      </div>
    </footer>
  );
}
