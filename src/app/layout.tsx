import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { hasDatabase, getSettings } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: "摄影作品集",
  description: "个人摄影作品集",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-next-pathname") || "";
  const isSetup = pathname.startsWith("/setup");

  if (!isSetup && !hasDatabase()) {
    redirect("/setup");
  }

  const settings = isSetup
    ? { siteName: "摄影作品集", copyright: "摄影作品集", icp: "" }
    : await getSettings();

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
        <Navbar siteName={settings.siteName} />
        <main>{children}</main>
        <Footer copyright={settings.copyright} icp={settings.icp} />
      </body>
    </html>
  );
}