import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl text-white">Adab<span className="text-emerald-400">ly</span></span>
            </Link>
            <p className="text-sm leading-relaxed">
              Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Qur'an, Hadits, dan literatur ulama.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Navigasi</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-emerald-400 transition-colors">Beranda</Link></li>
              <li><Link href="/kurikulum" className="hover:text-emerald-400 transition-colors">Pembelajaran</Link></li>
              <li><Link href="/qna" className="hover:text-emerald-400 transition-colors">Tanya Jawab</Link></li>
              <li><Link href="/artikel" className="hover:text-emerald-400 transition-colors">Artikel</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Kontributor</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Login Panel</Link></li>
            </ul>
            <p className="text-xs mt-6 text-slate-500">
              Konten disusun oleh kontributor dan telah melalui proses peninjauan tim redaksi. Pembaca dianjurkan merujuk langsung pada sumber asli (Al-Qur'an, Hadits, dan pendapat ulama) untuk memastikan keakuratan.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Adably. Hak cipta dilindungi.</p>
          <p className="flex items-center gap-1">Dibuat dengan <Heart className="h-3 w-3 text-rose-400 fill-rose-400" /> untuk generasi Muslim.</p>
        </div>
      </div>
    </footer>
  );
}
