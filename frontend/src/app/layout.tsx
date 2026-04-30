import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const amiri = Amiri({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-amiri" });

export const metadata: Metadata = {
  title: { default: "Adably - Belajar Islam Anak dengan Cara yang Mudah Dipahami", template: "%s | Adably" },
  description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist.",
  keywords: ["belajar islam anak", "parenting islami", "adably", "edukasi anak muslim"],
  metadataBase: new URL("https://adably.id"),
  openGraph: { title: "Adably", description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist.", url: "https://adably.id", siteName: "Adably", locale: "id_ID", type: "website" },
  twitter: { card: "summary_large_image", title: "Adably", description: "Platform edukasi Islam untuk anak — sesuai Alquran dan Hadist." },
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${amiri.variable} font-sans antialiased bg-slate-50 text-slate-800 flex flex-col min-h-screen`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
