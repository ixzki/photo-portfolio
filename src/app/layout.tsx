import type { Metadata } from "next";
import { Jost, Noto_Sans_SC } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/db";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-jost",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const description = (settings.aboutText || "个人摄影作品集").split("\n").filter(Boolean)[0] || "个人摄影作品集";
  const faviconUrl = settings.faviconUrl || "/favicon.ico";

  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description,
    icons: {
      icon: [{ url: faviconUrl }],
      shortcut: [faviconUrl],
    },
    openGraph: {
      title: settings.siteName,
      description,
      type: "website",
      images: settings.avatarUrl ? [{ url: settings.avatarUrl, alt: settings.siteName }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.siteName,
      description,
      images: settings.avatarUrl ? [settings.avatarUrl] : undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${jost.variable} ${notoSansSc.variable}`}>
        <Navbar siteName={settings.siteName} />
        <main>{children}</main>
        <Footer copyright={settings.copyright} icp={settings.icp} />
      </body>
    </html>
  );
}
