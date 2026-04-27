import Link from "next/link";
import { ChevronLeft, MessageCircle, AlertTriangle, Lightbulb } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";

export default function QnaDetailPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Banner */}
      <div className="bg-emerald-600 pt-8 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link href="/qna" className="inline-flex items-center gap-2 text-emerald-100 hover:text-white mb-6 font-medium transition-colors">
            <ChevronLeft size={20} /> Kembali ke Kumpulan QnA
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-amber-400 text-amber-900 text-xs font-extrabold uppercase tracking-wide rounded-md">
              Usia 5-7 Tahun
            </span>
            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-extrabold uppercase tracking-wide rounded-md border border-emerald-400">
              Tauhid
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Apakah Allah melihat saat aku sembunyi?
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-4xl px-4 -mt-10">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100">
          
          {/* Quick Answer */}
          <div className="mb-10 text-center">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-3">Jawaban Singkat</h3>
            <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed text-balance">
              "Tentu saja nak, Allah melihat semua yang kita lakukan karena Allah adalah <span className="text-emerald-600">Al-Bashiir</span> (Maha Melihat)."
            </p>
          </div>

          <hr className="border-slate-100 my-8" />

          {/* Dialog Section */}
          <div className="mb-10">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <MessageCircle className="text-emerald-500" /> Skrip Dialog Interaktif
            </h3>
            
            <div className="space-y-4">
              {/* Chat Bubble Anak */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                  <span className="text-lg">👦</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-tl-sm text-slate-700">
                  Ummi, kalau aku makan coklat diam-diam di bawah selimut waktu lampu mati, ada yang lihat tidak?
                </div>
              </div>
              
              {/* Chat Bubble Ortu */}
              <div className="flex gap-4 flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
                  <span className="text-lg">👩</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl rounded-tr-sm text-emerald-900">
                  Hmm.. mungkin Ummi dan Abi tidak lihat. Tapi, ada Dzat yang selalu melihat setiap saat walaupun sangat gelap.
                </div>
              </div>

              {/* Chat Bubble Anak */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                  <span className="text-lg">👦</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-tl-sm text-slate-700">
                  Siapa itu Ummi?
                </div>
              </div>

              {/* Chat Bubble Ortu */}
              <div className="flex gap-4 flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
                  <span className="text-lg">👩</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl rounded-tr-sm text-emerald-900">
                  Allah Ta'ala. Nama Allah adalah Al-Bashiir, yang artinya Maha Melihat. Allah bisa melihat semut hitam yang berjalan di atas batu hitam pada malam yang sangat gelap.
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Analogi Card */}
            <div className="bg-sky-50 border border-sky-100 p-6 rounded-2xl">
              <h4 className="flex items-center gap-2 font-bold text-sky-800 mb-2">
                <Lightbulb className="text-sky-500 h-5 w-5" /> Analogi Anak
              </h4>
              <p className="text-sm text-sky-700 leading-relaxed">
                "Seperti cahaya matahari yang bisa masuk lewat celah sekecil apapun dan menerangi ruangan. Begitu juga penglihatan Allah, menembus dinding dan selimutmu, tidak ada yang tersembunyi."
              </p>
            </div>

            {/* Dalil Card */}
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-amber-500/10 opacity-50">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h4 className="flex items-center gap-2 font-bold text-amber-800 mb-3">
                📚 Dalil Shahih
              </h4>
              <p className="font-arabic text-xl text-right leading-loose text-amber-950 mb-3" dir="rtl">
                إِنَّ ٱللَّهَ يَعْلَمُ غَيْبَ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ ۚ وَٱللَّهُ بَصِيرٌۢ بِمَا تَعْمَلُونَ
              </p>
              <p className="text-xs text-amber-700 leading-relaxed italic">
                "Sesungguhnya Allah mengetahui apa yang ghaib di langit dan di bumi. Dan Allah Maha Melihat apa yang kamu kerjakan."
              </p>
              <p className="text-xs font-bold text-amber-900 mt-2">— QS. Al-Hujurat: 18</p>
            </div>
          </div>

          {/* Tips Orang Tua */}
          <div className="mt-8 bg-slate-50 border border-slate-200 border-l-4 border-l-emerald-500 p-5 rounded-xl flex gap-4">
            <AlertTriangle className="text-emerald-500 shrink-0" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">Tips untuk Orang Tua</h4>
              <p className="text-sm text-slate-600">Berikan senyuman saat menceritakan hal ini agar anak tidak merasa ketakutan, melainkan merasa dilindungi dan dijaga oleh Allah.</p>
            </div>
          </div>

        </div>

        {/* Engagement System */}
        <EngagementBar contentId="123" initialLikes={45} initialBookmarks={12} initialRating={4.8} />
        
      </div>
    </div>
  );
}
