"use client";
import { useState, useEffect } from "react";
import { fetchPageContent } from "@/lib/api";
import { BookOpen, Heart, Target, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function TentangKamiPage() {
  const [page, setPage] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPageContent("about").catch(() => null),
      fetchPageContent("contact").catch(() => null),
    ]).then(([aboutRes, contactRes]) => {
      setPage(aboutRes?.data || null);
      setContact(contactRes?.data?.content || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Memuat...</div>
    </div>
  );

  const sections = page?.content?.sections || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="inline-flex bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <BookOpen className="h-5 w-5 mr-2" /> Platform Edukasi Parenting Islami
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{page?.title || "Tentang Adably"}</h1>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
            {sections.find((s: any) => s.type === "hero")?.subtitle || "Membantu orang tua Muslim mendidik anak sesuai nilai-nilai Islam"}
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl space-y-12">
        {sections.filter((s: any) => s.type === "text").map((section: any, i: number) => (
          <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              {i === 0 ? <Target className="text-emerald-600" size={24} /> : <Heart className="text-rose-500" size={24} />}
              <h2 className="text-2xl font-bold text-slate-800">{section.title}</h2>
            </div>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{section.body}</p>
          </div>
        ))}

        {/* Contact Section */}
        {contact?.isActive && contact?.whatsapp && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="text-emerald-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-800">Hubungi Kami</h2>
            </div>
            <p className="text-slate-600 mb-4">Ada pertanyaan? Silakan hubungi tim kami.</p>
            <a
              href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(contact.defaultMessage || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <MessageCircle size={20} />
              Chat via WhatsApp — {contact.displayName || 'CS Adably'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
