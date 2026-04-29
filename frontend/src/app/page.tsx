import Link from "next/link";
import { Search, ChevronRight, BookOpen, Star, ArrowRight, Sparkles } from "lucide-react";
import { fetchContentTree } from "@/lib/api";
import LandingDonation from "@/components/LandingDonation";
import LandingFeedback from "@/components/LandingFeedback";
import HeroSearchForm from "@/components/HeroSearchForm";

export default async function Home() {
  let curriculumNodes = [];
  try {
    const response = await fetchContentTree();
    curriculumNodes = response.data || [];
  } catch {
    curriculumNodes = [
      { id: '1', title: 'Tauhid & Aqidah', description: 'Mengenal Allah dan rukun iman', slug: 'tauhid-aqidah' },
      { id: '2', title: 'Ibadah Harian', description: 'Panduan wudhu, shalat, dan puasa', slug: 'ibadah-harian' },
      { id: '3', title: 'Adab Islami', description: 'Adab makan, tidur, dan bergaul', slug: 'adab' },
      { id: '4', title: 'Kisah Nabi', description: 'Kisah inspiratif para utusan Allah', slug: 'kisah' },
    ];
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative w-full overflow-hidden pb-20 pt-32 md:pt-40 min-h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-50 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100 via-teal-50 to-white opacity-70"></div>
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl animate-blob"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-300/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-amber-200/20 blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
        </div>
        <div className="container relative mx-auto px-4 md:px-6 z-10 flex flex-col items-center text-center">
          <div className="animate-float inline-flex items-center rounded-full border border-emerald-200/50 bg-white/60 backdrop-blur-md px-4 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm mb-8">
            <Sparkles className="h-4 w-4 text-amber-500 mr-2" />
            Sesuai Alquran dan Hadist
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-800 sm:text-6xl md:text-7xl/tight mb-6">
            Belajar Islam Anak dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Cara yang Mudah Dipahami</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 md:text-xl mb-12 font-medium">
            Temukan jawaban syar&#39;i, analogi sederhana, dan dalil shahih dalam hitungan detik.
          </p>
          <HeroSearchForm />
          <div className="flex flex-wrap justify-center items-center gap-3 mt-10">
            <p className="text-slate-500 font-semibold text-sm mr-2 hidden sm:block">Filter Cepat:</p>
            {['Balita (3-5)', 'Anak (5-7)', 'Pramuka (7-10)'].map((age, i) => (
              <button key={age} className={`px-5 py-2 rounded-full text-sm font-bold border ${i === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>{age}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Pembelajaran */}
      <section className="py-24 bg-white relative z-20 -mt-10 rounded-t-[3rem] shadow-[0_-10px_40px_rgb(0,0,0,0.03)] border-t border-slate-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">Pembelajaran Utama</h2>
              <p className="text-slate-500 mt-2 text-lg">Modul materi dasar keislaman yang terstruktur.</p>
            </div>
            <Link href="/kurikulum" className="inline-flex items-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-6 rounded-xl border border-slate-200">
              Jelajahi Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {curriculumNodes.map((node: any, index: number) => (
              <Link href={`/kurikulum/${node.slug}`} key={node.id} className={`group ${index === 0 || index === 3 ? 'md:col-span-2 lg:col-span-2' : ''}`}>
                <div className="relative h-full bg-slate-50 overflow-hidden p-8 rounded-3xl border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200">
                  <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:scale-150 group-hover:opacity-40 ${index % 2 === 0 ? 'bg-amber-400' : 'bg-teal-400'}`}></div>
                  <div className="relative z-20">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${index % 2 === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border border-amber-300' : 'bg-gradient-to-br from-emerald-100 to-teal-200 text-teal-700 border border-teal-300'}`}>
                      {index % 2 === 0 ? <Star className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">{node.title}</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">{node.description || 'Kumpulan materi edukasi anak.'}</p>
                    <div className="mt-8 flex items-center text-sm font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">
                      Mulai Belajar <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <LandingDonation />

      {/* Feedback Section */}
      <LandingFeedback />
    </div>
  );
}
