"use client";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "react-hot-toast";
import { usePathname } from "next/navigation";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import DonationPopup from "@/components/DonationPopup";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = !pathname.startsWith('/admin') && !pathname.startsWith('/login');

  return (
    <I18nProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#1e293b', color: '#f8fafc', fontWeight: 600 } }} />
      {isPublicPage && <AnnouncementBanner />}
      {isPublicPage && <Navbar />}
      <main className="flex-grow">{children}</main>
      {isPublicPage && <Footer />}
      {isPublicPage && <DonationPopup />}
    </I18nProvider>
  );
}
