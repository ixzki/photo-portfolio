import { getPublicFeatures } from "@/lib/db";
import FeatureStrip from "@/components/FeatureStrip";

export const revalidate = 300;

export default async function HomePage() {
  const features = await getPublicFeatures();
  return <FeatureStrip features={features} />;
}
