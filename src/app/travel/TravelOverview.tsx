"use client";

import dynamic from "next/dynamic";
import type { PublishedJourney } from "@/lib/journeys";
import styles from "./travel.module.css";

const OverviewMap = dynamic(() => import("./OverviewMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading} role="status" aria-label="路线地图加载中" />,
});

export default function TravelOverview({ routes }: { routes: PublishedJourney[] }) {
  return <section className={styles.overview} data-travel-page aria-label="旅行路线总览"><OverviewMap routes={routes} /></section>;
}
