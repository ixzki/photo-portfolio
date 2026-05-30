import { getSettings } from "@/lib/db";
import AboutPageClient from "@/components/AboutPageClient";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await getSettings();
  return <AboutPageClient settings={settings} />;
}
