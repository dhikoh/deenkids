"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, UserCircle, BookOpen, X } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Kurikulum", href: "/kurikulum" },
    { name: "Tanya Jawab", href: "/qna" },
    { name: "Artikel", href: "/artikel" },
  ];

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-xl group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className={`font-bold text-2xl tracking-tight transition-colors ${scrolled ? 'text-slate-800' : 'text-slate-800 lg:text-white'}`}>
              Deen<span className="text-emerald-500">Kids</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/40 shadow-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                  isActive ? "text-emerald-700 bg-white shadow-sm" : "text-slate-600 hover:text-emerald-600 hover:bg-white/60"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button className={`p-2.5 rounded-full transition-colors ${scrolled ? 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600' : 'text-slate-600 lg:text-white/80 hover:bg-white/20'}`}>
            <Search className="h-5 w-5" />
          </button>
          
          <Link href="/login" className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-full transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5">
            <UserCircle className="h-5 w-5" />
            Masuk
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            className={`md:hidden p-2.5 rounded-xl transition-colors ${scrolled ? 'text-slate-600 bg-slate-100' : 'text-slate-800 bg-white/80'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden absolute top-20 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-border shadow-xl overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[400px] py-4' : 'max-h-0 py-0'}`}>
        <div className="px-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-base font-bold p-3 rounded-xl transition-colors ${
                pathname === link.href ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/login" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 p-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl mt-4 shadow-md shadow-emerald-500/20"
          >
            <UserCircle className="h-5 w-5" />
            Area Kontributor
          </Link>
        </div>
      </div>
    </header>
  );
}
