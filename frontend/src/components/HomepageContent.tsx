"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Star, ArrowRight, MessageCircleQuestion, FileText, Eye, Heart, ChevronRight, Scroll } from "lucide-react";
import { fetchContentTree, fetchContentList, fetchKisahTree, fetchHomepageConfig } from "@/lib/api";

const AGE_FILTERS = [
  { label: "Semua Usia", value: "Semua" },
  { label: "Balita (3-5)", value: "3-5" },
  { label: "Anak (5-7)", value: "5-7" },
  { label: "Pramuka (7-10)", value: "7-10" },
  { label: "Pra-Remaja (10-13)", value: "10-13" },
];

function ContentCard({ item, index }: { item: any; index: number }) {
  const isQna = item.type === "QNA";
  const isPembelajaran = item.type === "PEMBELAJARAN";
  const isKisah = item.type === "KISAH";
  const typeLabel = isQna ? "Tanya Jawab" : isPembelajaran ? "Pembelajaran" : isKisah ? "Kisah" : "Artikel";
  const typeStyle = isQna
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : isPembelajaran
    ? "bg-purple-50 text-purple-700 border border-purple-200"
    : isKisah
    ? "bg-orange-50 text-orange-700 border border-orange-200"
    : "bg-sky-50 text-sky-700 border border-sky-200";

  // Routing berdasarkan tipe konten
  const href = isQna
    ? `/qna/${item.slug}`
    : isKisah
    ? `/kisah/${item.node?.slug}/${item.slug}`
    : `/artikel/${item.slug}`; // PEMBELAJARAN & ARTICLE keduanya menggunakan articleDetail

  return (
    <Link href={href} className="group">
      <div className="h-full bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 overflow-hidden">
        {item.thumbnailUrl && (
          <div className="w-full aspect-video overflow-hidden">
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeStyle}`}>
              {typeLabel}
            </span>
            <span className="text-xs text-slate-400 font-medium">{(item.ageGroups || []).join(', ')}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">{item.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">{item.description || "Konten edukasi Islam untuk anak."}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Eye size={14} /> {(item.viewCount || 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Heart size={14} /> {(item.likeCount || 0).toLocaleString()}</span>
            {(item.displayAuthorName || item.author?.name) && <span className="ml-auto font-medium text-slate-500">{item.displayAuthorName || item.author.name}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface HomepageContentProps {
  initialNodes: any[];
}

export default function HomepageContent({ initialNodes }: HomepageContentProps) {
  const [selectedAge, setSelectedAge] = useState("Semua");
  const [nodes, setNodes] = useState(initialNodes);
  const [qnaItems, setQnaItems] = useState<any[]>([]);
  const [articleItems, setArticleItems] = useState<any[]>([]);
  const [kisahNodes, setKisahNodes] = useState<any[]>([]);
  const [kisahPopular, setKisahPopular] = useState<any[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingQna, setLoadingQna] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [loadingKisah, setLoadingKisah] = useState(true);
  const [loadingKisahPopular, setLoadingKisahPopular] = useState(true);
  const [visibility, setVisibility] = useState({ pembelajaran: true, qna: true, kisah: true, article: true });

  // Fetch homepage visibility config once on mount
  useEffect(() => {
    fetchHomepageConfig()
      .then(config => setVisibility(config))
      .catch(() => { /* keep defaults — all visible */ });
  }, []);

  // Fetch QnA, Articles, Pembelajaran nodes — re-runs when age filter or visibility changes
  useEffect(() => {
    const ageParam = selectedAge === "Semua" ? undefined : selectedAge;

    if (visibility.pembelajaran) {
      setLoadingNodes(true);
      fetchContentTree(ageParam)
        .then((res) => setNodes(res?.data || res || []))
        .catch(() => setNodes([]))
        .finally(() => setLoadingNodes(false));
    }

    if (visibility.qna) {
      setLoadingQna(true);
      fetchContentList({ type: "QNA", sort: "popular", limit: 6, age: ageParam })
        .then((res) => setQnaItems(res?.data || []))
        .catch(() => setQnaItems([]))
        .finally(() => setLoadingQna(false));
    }

    if (visibility.article) {
      setLoadingArticle(true);
      fetchContentList({ type: "ARTICLE", sort: "newest", limit: 6, age: ageParam })
        .then((res) => setArticleItems(res?.data || []))
        .catch(() => setArticleItems([]))
        .finally(() => setLoadingArticle(false));
    }
  }, [selectedAge, visibility]);

  // Fetch Kisah sub-categories and popular kisah ONCE on mount (if visible)
  useEffect(() => {
    if (visibility.kisah) {
      fetchKisahTree()
        .then((res) => setKisahNodes(Array.isArray(res) ? res : (res?.data || [])))
        .catch(() => setKisahNodes([]))
        .finally(() => setLoadingKisah(false));

      fetchContentList({ type: "KISAH", sort: "popular", limit: 6 })
        .then((res) => setKisahPopular(res?.data || []))
        .catch(() => setKisahPopular([]))
        .finally(() => setLoadingKisahPopular(false));
    }
  }, [visibility.kisah]);

  const flatNodes = Array.isArray(nodes) ? nodes : [];

  return (
    <>
      {/* Age Filter Pills */}
      <div className="flex flex-wrap justify-center items-center gap-3 mt-10">
        <p className="text-slate-500 font-semibold text-sm mr-2 hidden sm:block">Filter Usia:</p>
        {AGE_FILTERS.map((age) => (
          <button
            key={age.value}
            onClick={() => setSelectedAge(age.value)}
            className={`px-5 py-2 rounded-full text-sm font-bold border transition-all duration-200 ${
              selectedAge === age.value
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {age.label}
          </button>
        ))}
      </div>
      {/* ═══ Section Order: 1. Pembelajaran, 2. Tanya Jawab, 3. Artikel, 4. Kisah Islami ═══ */}

      {/* 1️⃣ Pembelajaran Utama */}
      {visibility.pembelajaran && (
      <section className="py-24 bg-white relative z-20 -mt-10 rounded-t-[3rem] shadow-[0_-10px_40px_rgb(0,0,0,0.03)] border-t border-slate-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">📚 Pembelajaran Utama</h2>
              <p className="text-slate-500 mt-2 text-lg">Modul materi dasar keislaman yang terstruktur.</p>
            </div>
            <Link href="/pembelajaran" className="inline-flex items-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-6 rounded-xl border border-slate-200">
              Jelajahi Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {loadingNodes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : flatNodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {flatNodes.map((node: any, index: number) => (
                <Link href={`/pembelajaran/${node.slug}`} key={node.id} className={`group ${index === 0 || index === 3 ? "md:col-span-2 lg:col-span-2" : ""}`}>
                  <div className="relative h-full bg-slate-50 overflow-hidden p-8 rounded-3xl border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200">
                    <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:scale-150 group-hover:opacity-40 ${index % 2 === 0 ? "bg-amber-400" : "bg-teal-400"}`} />
                    <div className="relative z-20">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${index % 2 === 0 ? "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border border-amber-300" : "bg-gradient-to-br from-emerald-100 to-teal-200 text-teal-700 border border-teal-300"}`}>
                        {index % 2 === 0 ? <Star className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">{node.title}</h3>
                      <p className="text-slate-600 font-medium leading-relaxed">{node.description || "Kumpulan materi edukasi anak."}</p>
                      <div className="mt-8 flex items-center text-sm font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">
                        Mulai Belajar <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      )}

      {/* 2️⃣ Tanya Jawab Populer */}
      {visibility.qna && (
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">❓ Tanya Jawab Populer</h2>
              <p className="text-slate-500 mt-2 text-lg">Jawaban syar&apos;i untuk pertanyaan anak sehari-hari.</p>
            </div>
            <Link href="/qna" className="inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 px-6 rounded-xl border border-amber-200">
              Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {loadingQna ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : qnaItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qnaItems.map((item: any, i: number) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
      )}

      {/* 3️⃣ Artikel Terbaru */}
      {visibility.article && (
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">📖 Artikel Terbaru</h2>
              <p className="text-slate-500 mt-2 text-lg">Panduan dan kisah inspiratif untuk keluarga Muslim.</p>
            </div>
            <Link href="/artikel" className="inline-flex items-center bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold py-2.5 px-6 rounded-xl border border-sky-200">
              Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {loadingArticle ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-white rounded-2xl animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : articleItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articleItems.map((item: any, i: number) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
      )}

      {/* 4️⃣ Kisah Islami (paling bawah) */}
      {visibility.kisah && (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">📖 Kisah Islami</h2>
              <p className="text-slate-500 mt-2 text-lg">Sirah Nabawiyah, teladan sahabat, dan cerita Islami untuk anak.</p>
            </div>
            <Link href="/kisah" className="inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 px-6 rounded-xl border border-amber-200">
              Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {loadingKisah ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-amber-50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : kisahNodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kisahNodes.slice(0, 6).map((node: any, index: number) => (
                <Link href={`/kisah/${node.slug}`} key={node.id} className="group">
                  <div className="relative h-full bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden p-5 rounded-3xl border border-amber-200 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-amber-400">
                    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 ${index % 2 === 0 ? 'bg-amber-400' : 'bg-orange-400'}`} />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700 border border-amber-300">
                        {node.icon ? <span className="text-lg">{node.icon}</span> : <Scroll className="h-5 w-5" />}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-amber-700 transition-colors flex-1">{node.title}</h3>
                      <ArrowRight className="h-4 w-4 text-amber-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      )}

      {/* 4️⃣b Kisah Islami Populer */}
      {visibility.kisah && (
      <section className="py-16 bg-gradient-to-b from-white to-amber-50/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-3">
                ⭐ Paling Banyak Dibaca
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800">Kisah Islami Populer</h2>
              <p className="text-slate-500 mt-1">Kisah-kisah yang paling banyak disukai oleh keluarga Muslim.</p>
            </div>
            <Link href="/kisah" className="inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 px-6 rounded-xl border border-amber-200 shrink-0">
              Semua Kisah <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          {loadingKisahPopular ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-amber-50 rounded-2xl animate-pulse border border-amber-100" />
              ))}
            </div>
          ) : kisahPopular.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kisahPopular.map((item: any, i: number) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
      )}
    </>
  );
}
