import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function KurikulumDetail({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Beranda
      </Link>
      
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-4 capitalize">
          {slug.replace(/-/g, " ")}
        </h1>
        <p className="text-slate-600 text-lg mb-8">
          Materi pembelajaran untuk kategori ini sedang dalam tahap pengembangan.
        </p>
        
        <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
          <p className="font-medium">Jazakumullahu khairan atas kesabarannya.</p>
          <p className="text-sm mt-2 opacity-80">Konten akan segera tersedia.</p>
        </div>
      </div>
    </div>
  );
}
