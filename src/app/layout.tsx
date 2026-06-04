import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/db";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();
    const description = (settings.aboutText || "个人摄影作品集").split("\n").filter(Boolean)[0] || "个人摄影作品集";

    return {
      title: {
        default: settings.siteName,
        template: `%s | ${settings.siteName}`,
      },
      description,
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
  } catch {
    return {
      title: "摄影作品集",
      description: "个人摄影作品集",
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let siteName = "摄影作品集";
  let copyright = "摄影作品集";
  let icp = "";

  try {
    const settings = await getSettings();
    siteName = settings.siteName;
    copyright = settings.copyright;
    icp = settings.icp;
  } catch {
    // Settings not available, use defaults.
  }

  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;700&amp;family=Noto+Sans+SC:wght@300;400;500;700&amp;display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar siteName={siteName} />
        <main>{children}</main>
        <Footer copyright={copyright} icp={icp} />
      </body>
    </html>
  );
}
