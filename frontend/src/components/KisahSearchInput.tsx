"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ArrowRight, X } from "lucide-react";

interface KisahSearchInputProps {
  nodeSlug: string;
  initialValue?: string;
  placeholder?: string;
}

export default function KisahSearchInput({ nodeSlug, initialValue = "", placeholder = "Cari kisah..." }: KisahSearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim().length >= 2) params.set("search", query.trim());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    router.push(`/kisah/${nodeSlug}?page=1`);
  };

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 mb-8 max-w-2xl">
      <div className="relative flex-grow flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-8 bg-transparent outline-none text-slate-700 text-sm font-medium"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-2 text-slate-400 hover:text-slate-600" aria-label="Hapus pencarian">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        onClick={handleSearch}
        className="h-10 px-5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 text-sm transition-colors"
      >
        Cari <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
