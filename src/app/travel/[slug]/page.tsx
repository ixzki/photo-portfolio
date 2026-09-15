import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedJourney } from "@/lib/journeys";
import TravelJournal from "../TravelJournal";
import DetailMotionTrigger from "@/components/DetailMotionTrigger";
import DetailProjectTitle from "@/components/DetailProjectTitle";
import ImageLoader from "@/components/ImageLoader";
import JourneyOutline from "../JourneyOutline";
import JourneyCoverStats from "../JourneyCoverStats";
import styles from "../travel.module.css";

export const revalidate = 300;

// Build each public journey on its first visit, then reuse the rendered page.
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const route = await getPublishedJourney(slug);
  return { title: route ? `${route.journey.title} · 旅行` : "旅行" };
}

export default async function JourneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = await getPublishedJourney(slug);
  if (!route) notFound();
  return (
    <section className={`view detail-page is-active ${styles.detailPage}`} data-travel-page aria-label="旅行详情">
      <DetailMotionTrigger />
      <div className="cover">
        <ImageLoader {...route.cover} className="cover-image" priority
          sizes={`(max-aspect-ratio: ${route.cover.width}/${route.cover.height}) ${Math.ceil(route.cover.width / route.cover.height * 100)}vh, 100vw`}
          variant="cover" />
        <JourneyCoverStats journey={route.journey} />
        <DetailProjectTitle title={route.journey.title} className={styles.coverCaption}>
          <JourneyOutline journey={route.journey} />
        </DetailProjectTitle>
      </div>
      <TravelJournal journey={route.journey} />
    </section>
  );
}
