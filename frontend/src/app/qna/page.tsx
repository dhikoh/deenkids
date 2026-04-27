import Link from "next/link";
import { MessageCircle, Search, ThumbsUp, Heart, Star } from "lucide-react";

export default function QnaPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-4">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Bank Pertanyaan Anak</h1>
        <p className="text-slate-500 max-w-xl">Temukan jawaban cerdas, ringkas, dan syar'i untuk pertanyaan-pertanyaan kritis si kecil.</p>
      </div>

      {/* Search & Sort Bar */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 mb-8">
        <div className="relative flex-grow flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari pertanyaan..."
            className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-slate-700 text-sm font-medium"
          />
        </div>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        <select className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-medium cursor-pointer border-none">
          <option>Terbaru</option>
          <option>Paling Banyak Dibaca</option>
          <option>Rating Tertinggi</option>
          <option>Paling Disukai</option>
        </select>
      </div>

      {/* QnA Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Placeholder */}
        <Link href="/qna/apakah-allah-melihat-saat-aku-sembunyi" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md uppercase tracking-wider">Tauhid</span>
            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">5-7 th</span>
            <div className="ml-auto flex items-center gap-1 text-amber-500 text-xs font-bold">
              <Star className="h-3 w-3 fill-amber-500" /> 4.8
            </div>
          </div>
          
          <h3 className="font-bold text-lg text-slate-800 leading-snug mb-2 group-hover:text-emerald-600 transition-colors">
            Apakah Allah melihat saat aku bersembunyi di bawah selimut?
          </h3>
          
          <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
            Tentu saja, Allah melihat semua yang kita lakukan karena Allah Al-Bashiir (Maha Melihat)...
          </p>
          
          <div className="border-t border-slate-100 pt-3 flex items-center gap-4 text-slate-400 text-xs font-medium">
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> 45</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> 12</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
