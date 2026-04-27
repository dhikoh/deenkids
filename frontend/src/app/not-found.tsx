import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 pt-20">
      <div className="text-center">
        <div className="bg-slate-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <SearchX className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3">404</h1>
        <p className="text-lg text-slate-500 mb-8 font-medium">
          Halaman yang Anda cari tidak ditemukan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Home className="h-5 w-5" /> Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
