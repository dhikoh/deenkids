"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error("[GlobalError]", error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 pt-20">
      <div className="text-center max-w-md">
        <div className="bg-rose-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-rose-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3">
          Terjadi Kesalahan
        </h1>
        <p className="text-slate-500 mb-2 font-medium">
          Maaf, terjadi kesalahan yang tidak terduga. Tim kami sedang bekerja untuk memperbaikinya.
        </p>
        {error?.digest && (
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
          >
            <Home className="h-4 w-4" />
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
