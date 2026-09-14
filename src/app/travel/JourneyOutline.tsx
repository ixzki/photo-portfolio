import type { Journey } from "@/lib/journey";
import { journeyOutline } from "@/lib/journey-outline";
import styles from "./travel.module.css";

export default function JourneyOutline({ journey }: { journey: Journey }) {
  return <svg className={styles.coverOutline} viewBox="0 0 320 220" role="img" aria-label={`${journey.title}完整路线轮廓`}>
    {journeyOutline(journey.segments).map((path, index) => <path key={index} d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}
