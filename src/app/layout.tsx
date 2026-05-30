import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "摄影作品集",
  description: "个人摄影作品集",
};

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
    // Settings not available (no DB), use defaults
  }

  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar siteName={siteName} />
        <main>{children}</main>
        <Footer copyright={copyright} icp={icp} />
      </body>
    </html>
  );
}