"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export default function HeroSearchForm() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (query.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl p-2.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-emerald-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Cari: Kenapa kita shalat?"
            className="w-full h-14 pl-12 pr-4 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium text-lg"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:shadow-xl transition-shadow"
        >
          Cari Jawaban <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
