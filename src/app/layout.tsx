import type { Metadata } from "next";
import { Jost, Noto_Sans_SC } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import SiteLoading from "@/components/SiteLoading";
import { getShellSettings } from "@/lib/db";
import { isDemoPreview, isReadOnlyPreview } from "@/lib/preview-config.mjs";
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
  const settings = await getShellSettings();
  const description = (settings.aboutText || "个人摄影作品集").split("\n").filter(Boolean)[0] || "个人摄影作品集";
  const faviconUrl = settings.faviconUrl || "/favicon.ico";

  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description,
    ...(isReadOnlyPreview() || (!process.env.VERCEL && process.env.LOCAL_PREVIEW_LABEL) ? { robots: { index: false, follow: false } } : {}),
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
  // Resolve the shared cached settings before rendering any brand text, including
  // the loader's server-rendered first frame. No client-side name replacement.
  const settings = await getShellSettings();
  const previewLabel = !process.env.VERCEL ? process.env.LOCAL_PREVIEW_LABEL : undefined;

  return (
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${jost.variable} ${notoSansSc.variable}`}>
        <SiteLoading siteName={settings.siteName}>
          <ScrollProgress />
          {(isReadOnlyPreview() || previewLabel) && (
            <div className="preview-notice" role="status" style={{ position: "fixed", bottom: 12, left: 12, zIndex: 9999, maxWidth: "calc(100vw - 24px)", padding: "8px 12px", background: "#172019", color: "#fff", fontSize: 12, borderRadius: 6 }}>
              {isDemoPreview() ? "本地示例预览 · 非线上作品 · 只读" : isReadOnlyPreview() ? "只读预览 · 修改与删除已禁用" : previewLabel}
            </div>
          )}
          <Navbar siteName={settings.siteName} />
          <main>{children}</main>
          <Footer copyright={settings.copyright} icp={settings.icp} />
        </SiteLoading>
      </body>
    </html>
  );
}
