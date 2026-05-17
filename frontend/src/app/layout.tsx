import type { Metadata, Viewport } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { JsonLd, buildOrganizationSchema, buildWebSiteSchema, buildItemListSchema } from "@/components/seo/JsonLd";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#10b981',
};

export const metadata: Metadata = {
  title: { default: "Adably - Belajar Islam Anak dengan Cara yang Mudah Dipahami", template: "%s | Adably" },
  description: "Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Quran, Hadits, dan literatur ulama.",
  keywords: ["belajar islam anak", "parenting islami", "adably", "edukasi anak muslim"],
  metadataBase: new URL("https://adably.id"),
  manifest: "/manifest.json",
  openGraph: { title: "Adably", description: "Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Quran, Hadits, dan literatur ulama.", url: "https://adably.id", siteName: "Adably", locale: "id_ID", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Adably - Platform Edukasi Parenting Islami" }] },
  twitter: { card: "summary_large_image", title: "Adably", description: "Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Quran, Hadits, dan literatur ulama.", images: ["/og-image.png"] },
  icons: { icon: "/favicon.svg", apple: "/icons/icon-192.png" },
  robots: { index: true, follow: true },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        {/* AI Discovery — helps AI crawlers find structured content */}
        <link rel="author" href="/llms.txt" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM Content Summary" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLM Content Detail" />
        {/* Citation meta — untuk AI search engine extraction */}
        <meta name="citation_title" content="Adably - Platform Edukasi Parenting Islami" />
        <meta name="citation_author" content="Adably" />
        <meta name="citation_publisher" content="Adably" />
        <meta name="citation_language" content="id" />
        {/* Search Engine Verification */}
        <meta name="google-site-verification" content="PQlBl_UGRP_5yyKBcybYaFns5IgsCE4jEsL7mRL0mVk" />
      </head>
      <body className={`${inter.variable} ${amiri.variable} font-sans antialiased bg-slate-50 text-slate-800 flex flex-col min-h-screen`}>
        <JsonLd schema={buildOrganizationSchema()} />
        <JsonLd schema={buildWebSiteSchema()} />
        <JsonLd schema={buildItemListSchema()} />
        <ClientProviders>{children}</ClientProviders>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`
          }}
        />
      </body>
    </html>
  );
}
