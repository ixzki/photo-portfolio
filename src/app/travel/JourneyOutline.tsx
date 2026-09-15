import type { Journey } from "@/lib/journey";
import { journeyOutline } from "@/lib/journey-outline";
import styles from "./travel.module.css";

export default function JourneyOutline({ journey }: { journey: Journey }) {
  const paths = journeyOutline(journey.segments);
  return <svg className={styles.coverOutline} viewBox="0 0 320 220" role="img" aria-label={`${journey.title}完整路线轮廓`}>
    <g fill="none" stroke="#000" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((path, index) => <path key={index} d={path} vectorEffect="non-scaling-stroke" />)}
    </g>
    <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((path, index) => <path key={index} d={path} vectorEffect="non-scaling-stroke" />)}
    </g>
  </svg>;
}
