import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Tentang Adably — platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Quran, Hadits, dan literatur ulama.",
  openGraph: { title: "Tentang Adably", description: "Platform edukasi parenting Islami.", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
};

export default function TentangKamiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
