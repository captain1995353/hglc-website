import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/i18n";
import { site, siteUrl } from "@/lib/site";
import { supabaseConfigured } from "@/lib/env";
import { DemoBanner } from "@/components/DemoBanner";
import { AnnouncementBar } from "@/components/AnnouncementBar";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Korean & English courses in Dhaka`,
    template: `%s · ${site.shortName}`,
  },
  description:
    "Korean and English language courses in Dhaka and online: Basic Korean, TOPIK I & II preparation, Foundation English and IELTS preparation. Enrol and pay online.",
  keywords: [
    "Korean language course Dhaka",
    "TOPIK preparation Bangladesh",
    "IELTS course Dhaka",
    "English course Dhaka",
    "한국어 학원 다카",
    "Hangeul Global Learning Center",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Korean & English courses in Dhaka`,
    description:
      "TOPIK and IELTS preparation, plus Korean and English from beginner level. On campus in Dhaka and live online.",
    url: siteUrl,
    images: [{ url: "/logo.jpeg", width: 1600, height: 1600, alt: site.name }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#24315e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        {!supabaseConfigured && <DemoBanner />}
        <AnnouncementBar />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
