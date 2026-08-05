import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site, siteUrl } from "@/lib/site";

/**
 * Root layout: document shell only. The public site and the admin dashboard
 * each bring their own header and footer from their own layout.
 */

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
