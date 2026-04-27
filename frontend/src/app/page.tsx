import Link from "next/link";
import { Search, ChevronRight, BookOpen, Star, ArrowRight } from "lucide-react";
import { fetchContentTree } from "@/lib/api";

export default async function Home() {
  let curriculumNodes = [];
  try {
    const response = await fetchContentTree();
    curriculumNodes = response.data || [];
  } catch (error) {
    console.error("Failed to fetch curriculum tree:", error);
    // Fallback data if backend is not reachable yet
    curriculumNodes = [
      { id: '1', title: 'Tauhid & Aqidah', description: 'Mengenal Allah dan rukun iman', slug: 'tauhid-aqidah' },
      { id: '2', title: 'Ibadah Harian', description: 'Shalat, puasa, dan doa sehari-hari', slug: 'ibadah-harian' }
    ];
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full bg-gradient-to-br from-emerald-500 to-teal-700 overflow-hidden pb-16 pt-24 md:pt-32">
        {/* Background Pattern (SVG from Library) */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="w-full h-full" fill="none">
            <path d="M0 200 Q 200 300 400 200 T 800 200 V 400 H 0 Z" fill="#ffffff" />
            <circle cx="100" cy="100" r="150" stroke="#ffffff" strokeWidth="2" />
            <circle cx="700" cy="300" r="200" stroke="#ffffff" strokeWidth="2" />
            <path d="M400 50l20 40 40 20-40 20-20 40-20-40-40-20 40-20z" fill="#ffffff" />
            <path d="M700 80l10 20 20 10-20 10-10 20-10-20-20-10 20-10z" fill="#ffffff" />
            <path d="M100 300l15 30 30 15-30 15-15 30-15-30-30-15 30-15z" fill="#ffffff" />
          </svg>
        </div>

        <div className="container relative mx-auto px-4 md:px-6 z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-300/30 bg-white/10 px-3 py-1 text-sm font-medium text-emerald-50 backdrop-blur-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 mr-2 animate-pulse"></span>
            Berdasarkan Al-Qur'an & Sunnah (Manhaj Salaf)
          </div>
          
          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl/tight mb-6">
            Menjawab Pertanyaan Sulit Anak dengan <span className="text-amber-300">Cara Sederhana</span>
          </h1>
          
          <p className="max-w-2xl text-lg text-emerald-50 md:text-xl mb-10">
            Perpustakaan edukasi Islam untuk orang tua. Temukan jawaban syar'i, analogi anak, dan dalil shahih dalam hitungan detik.
          </p>

          {/* Search Box */}
          <div className="w-full max-w-2xl bg-white p-2 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari: Kenapa kita shalat? Kenapa Allah tidak terlihat?"
                className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
              />
            </div>
            <button className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors sm:w-auto w-full flex items-center justify-center gap-2">
              Cari Jawaban <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Age Filters (Sticky logic will be implemented later) */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <p className="text-emerald-100 font-medium w-full mb-2 text-sm">Pilih Usia Anak:</p>
            {['Semua', '3-5 Tahun', '5-7 Tahun', '7-10 Tahun'].map((age, i) => (
              <button 
                key={age}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  i === 0 ? 'bg-white text-emerald-700 shadow-md' : 'bg-emerald-600/50 text-white hover:bg-emerald-600'
                }`}
              >
                {age}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Kurikulum Utama</h2>
              <p className="text-slate-500 mt-1">Materi dasar keislaman yang wajib diajarkan</p>
            </div>
            <Link href="/kurikulum" className="hidden sm:flex text-emerald-600 font-semibold items-center hover:text-emerald-700">
              Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {curriculumNodes.map((node: any, index: number) => (
              <Link href={`/kurikulum/${node.slug}`} key={node.id}>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${index % 2 === 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {index % 2 === 0 ? <Star className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{node.title}</h3>
                  <p className="text-xs text-slate-500">{node.description || 'Kumpulan materi edukasi anak'}</p>
                </div>
              </Link>
            ))}
            
            {curriculumNodes.length === 0 && (
              <div className="col-span-4 py-10 text-center text-slate-500">
                Belum ada kurikulum yang ditambahkan. Silakan jalankan Seed.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
