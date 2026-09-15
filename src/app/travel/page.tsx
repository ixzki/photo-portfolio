import type { Metadata } from "next";
import TravelOverview from "./TravelOverview";
import { getPublishedJourneyOverviews } from "@/lib/journeys";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "旅行",
};

export default async function TravelPage() {
  return <TravelOverview routes={await getPublishedJourneyOverviews()} />;
}
