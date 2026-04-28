import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import DonationPopup from "@/components/DonationPopup";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const metadata: Metadata = {
  title: {
    default: "Adably - Belajar Islam Anak dengan Cara yang Mudah Dipahami",
    template: "%s | Adably",
  },
  description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist. Tanya jawab, artikel, dan kurikulum islami untuk keluarga Muslim.",
  keywords: ["belajar islam anak", "parenting islami", "tanya jawab islam anak", "kurikulum islam", "adably", "edukasi anak muslim"],
  metadataBase: new URL("https://adably.id"),
  openGraph: {
    title: "Adably - Belajar Islam Anak",
    description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist.",
    url: "https://adably.id",
    siteName: "Adably",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adably - Belajar Islam Anak",
    description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${amiri.variable} font-sans antialiased bg-slate-50 text-slate-800 flex flex-col min-h-screen`}>
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#1e293b', color: '#f8fafc', fontWeight: 600 } }} />
        <AnnouncementBanner />
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <DonationPopup />
      </body>
    </html>
  );
}
