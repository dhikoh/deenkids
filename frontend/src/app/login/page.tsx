"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ChevronLeft } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);
    
    try {
      const data = await login({ email, password });
      
      // Store JS-accessible tokens for cross-origin compatibility
      // (HttpOnly cookies from api.adably.id are not accessible on adably.id)
      if (data.accessToken) {
        Cookies.set("_at", data.accessToken, {
          expires: 1/96, // ~15 minutes (synced with JWT lifetime)
          path: "/",
          secure: window.location.protocol === 'https:',
          sameSite: 'lax',
        });
      }
      if (data.refreshToken) {
        Cookies.set("_rt", data.refreshToken, {
          expires: 7, // 7 days
          path: "/",
          secure: window.location.protocol === 'https:',
          sameSite: 'lax',
        });
      }
      
      // Store basic user info in localStorage for UI purposes
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      
      toast.success("Berhasil masuk!");
      
      // Hard navigation ensures middleware picks up the fresh cookies
      window.location.href = '/admin';
    } catch (error: any) {
      const msg = error.message || "Gagal masuk";
      if (msg.includes("429") || msg.includes("Too Many") || msg.includes("banyak")) {
        toast.error("Terlalu banyak percobaan login. Tunggu 5 menit.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-emerald-500 opacity-10"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-amber-500 opacity-10"></div>
        
        <div>
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
              <Lock className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Masuk ke Adably
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Panel kontributor — platform edukasi parenting Islami
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Alamat Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="Alamat Email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Kata Sandi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-3 pl-10 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="Kata Sandi"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <details className="text-sm">
            <summary className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer">Lupa Password?</summary>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-amber-800 font-medium text-xs">Silakan hubungi Admin untuk reset password.</p>
              <p className="text-amber-600 text-xs mt-1">📧 Email: admin@adably.id</p>
            </div>
          </details>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
