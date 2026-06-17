import { getSettings } from "@/lib/db";
import AboutPageClient from "@/components/AboutPageClient";

export const revalidate = 300;

export default async function AboutPage() {
  const settings = await getSettings();
  return <AboutPageClient settings={settings} />;
}
