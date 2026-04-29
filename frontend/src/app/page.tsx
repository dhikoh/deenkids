import { Sparkles } from "lucide-react";
import { fetchContentTree } from "@/lib/api";
import LandingFeedback from "@/components/LandingFeedback";
import HeroSearchForm from "@/components/HeroSearchForm";
import HomepageContent from "@/components/HomepageContent";

export default async function Home() {
  let curriculumNodes: any[] = [];
  try {
    const response = await fetchContentTree();
    curriculumNodes = response?.data || response || [];
  } catch {
    curriculumNodes = [];
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
          {/* Age Filter moved to HomepageContent for interactivity */}
        </div>
      </section>

      {/* Interactive Content Sections (Client Component) */}
      <HomepageContent initialNodes={curriculumNodes} />

      {/* Feedback Section */}
      <LandingFeedback />
    </div>
  );
}
