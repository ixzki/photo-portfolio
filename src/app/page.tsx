import { getPublicFeatures } from "@/lib/db";
import FeatureStrip from "@/components/FeatureStrip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const features = await getPublicFeatures();
  return <FeatureStrip features={features} />;
}
