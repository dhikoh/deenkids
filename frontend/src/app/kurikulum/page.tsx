import Link from "next/link";
import { FolderTree, Search, ChevronRight, BookOpen } from "lucide-react";

export default function KurikulumPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="h-8 w-8 text-emerald-500" />
            Kurikulum DeenKids
          </h1>
          <p className="text-slate-500 mt-2">Materi terstruktur dari aqidah hingga adab sehari-hari.</p>
        </div>
        
        {/* Sticky Age Filter for Curriculum */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
          {['3-5 Tahun', '5-7 Tahun', '7-10 Tahun'].map((age, i) => (
            <button 
              key={age}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                i === 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar / Tree Navigation (Placeholder) */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit">
          <h2 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Kategori Utama</h2>
          <ul className="space-y-2">
            <li>
              <button className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Tauhid & Aqidah</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Sub-tree */}
              <ul className="ml-6 mt-2 space-y-1 border-l-2 border-emerald-100 pl-4">
                <li>
                  <Link href="/kurikulum/mengenal-allah" className="block p-2 text-sm text-slate-600 hover:text-emerald-600 font-medium">
                    Mengenal Allah
                  </Link>
                </li>
                <li>
                  <Link href="/kurikulum/rukun-iman" className="block p-2 text-sm text-slate-600 hover:text-emerald-600 font-medium">
                    Rukun Iman
                  </Link>
                </li>
              </ul>
            </li>
            <li>
              <button className="w-full flex items-center justify-between p-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400" /> Adab & Akhlak</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </li>
          </ul>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Mengenal Allah</h2>
            <p className="text-slate-500 mb-6">Modul dasar untuk menanamkan keyakinan bahwa Allah adalah Sang Pencipta.</p>
            
            <div className="space-y-3">
              {/* Content List Item */}
              <Link href="/qna/apakah-allah-melihat-saat-aku-sembunyi" className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors group">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">QnA</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">Usia 5-7</span>
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Apakah Allah melihat saat aku sembunyi?</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">Tentu saja, Allah melihat semua yang kita lakukan karena Allah Al-Bashiir...</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
