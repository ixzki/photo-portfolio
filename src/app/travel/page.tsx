import type { Metadata } from "next";
import TravelOverview from "./TravelOverview";
import { getPublishedJourneys } from "@/lib/journeys";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "旅行",
};

export default async function TravelPage() {
  return <TravelOverview routes={await getPublishedJourneys()} />;
}
