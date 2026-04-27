"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, User, BookOpen } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Beranda", href: "/" },
    { name: "Kurikulum", href: "/kurikulum" },
    { name: "QnA Anak", href: "/qna" },
    { name: "Artikel", href: "/artikel" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-emerald-800 tracking-tight">DeenKids</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                pathname === link.href ? "text-emerald-600 font-semibold" : "text-slate-600"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
            <Search className="h-5 w-5" />
          </button>
          
          <Link href="/login" className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm rounded-full transition-colors">
            <User className="h-4 w-4" />
            Masuk
          </Link>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-border p-4 flex flex-col gap-4 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-base font-medium p-2 rounded-lg ${
                pathname === link.href ? "bg-emerald-50 text-emerald-600" : "text-slate-600"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            href="/login" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 p-3 bg-emerald-500 text-white font-semibold rounded-lg mt-2"
          >
            <User className="h-5 w-5" />
            Masuk / Editor
          </Link>
        </div>
      )}
    </header>
  );
}
