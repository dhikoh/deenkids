import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konten Tersimpan",
  description: "Lihat konten yang telah Anda simpan (bookmark) di perangkat ini.",
  openGraph: { title: "Konten Tersimpan — Adably", description: "Lihat konten yang telah Anda simpan.", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
};

export default function TersimpanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
