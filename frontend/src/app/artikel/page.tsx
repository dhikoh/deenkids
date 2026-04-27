import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";

export default function ArtikelPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Beranda
      </Link>
      
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Artikel & Panduan</h1>
        </div>
        
        <p className="text-slate-600 text-lg mb-8">
          Halaman kumpulan artikel parenting Islami sedang dalam tahap penulisan oleh tim asatidzah kami.
        </p>
        
        <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
          <p className="font-medium">Nantikan update selanjutnya!</p>
          <p className="text-sm mt-2 opacity-80">Kami berkomitmen menyajikan konten yang shahih sesuai pemahaman Salafus Shalih.</p>
        </div>
      </div>
    </div>
  );
}
