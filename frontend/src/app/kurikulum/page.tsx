import Link from "next/link";
import { fetchContentTree } from "@/lib/api";
import { BookOpen, ChevronRight, Star, Layers } from "lucide-react";

export default async function KurikulumPage() {
  let tree: any[] = [];
  try {
    tree = await fetchContentTree();
  } catch {
    tree = [];
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-4">
          <Layers className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Pembelajaran Islami</h1>
        <p className="text-slate-500 max-w-xl font-medium">
          Struktur materi keislaman yang terorganisir untuk pendidikan anak Anda.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tree.map((category: any, idx: number) => (
          <div key={category.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
            <div className={`p-6 ${idx % 2 === 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-amber-50 to-orange-50'}`}>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${idx % 2 === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {idx % 2 === 0 ? <BookOpen className="h-6 w-6" /> : <Star className="h-6 w-6" />}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{category.title}</h2>
              <p className="text-sm text-slate-500">{category.description || 'Kumpulan materi edukasi anak.'}</p>
            </div>

            {category.children && category.children.length > 0 && (
              <div className="p-4 space-y-1">
                {category.children.map((mod: any) => (
                  <Link key={mod.id} href={`/kurikulum/${mod.slug}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors group/link">
                    <span>{mod.title}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {tree.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-lg">Belum ada pembelajaran</p>
            <p className="text-sm mt-1">Jalankan seed untuk menambahkan data awal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
