import type { Journey } from "@/lib/journey";
import { formatJourneyTime } from "@/lib/journey-metadata";
import { formatJourneyDuration, getJourneySummary } from "@/lib/journey-summary";
import styles from "./travel.module.css";

export default function JourneyCoverStats({ journey }: { journey: Journey }) {
  const { distanceMeters, startTime, endTime, durationSeconds } = getJourneySummary(journey);
  const distance = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(distanceMeters / 1000);
  const start = formatJourneyTime(startTime);
  const end = formatJourneyTime(endTime);
  const duration = formatJourneyDuration(durationSeconds);
  return <div className={styles.coverStats} role="group" aria-label="本次路线距离与时间">
    {start && end && <p className={styles.coverDates} aria-label={`北京时间 ${start} 至 ${end}`}>
      <time dateTime={new Date(startTime! * 1000).toISOString()}>{start}</time>
      {end !== start && <><span aria-hidden="true">—</span><time dateTime={new Date(endTime! * 1000).toISOString()}>{end}</time></>}
    </p>}
    <div className={styles.coverMetrics}>
      <p className={styles.coverDistance} aria-label={`已记录路线 ${distance} 公里`}>{distance} KM</p>
      {duration && <p className={styles.coverDuration} aria-label={`行程时长 ${duration}`}>{duration}</p>}
    </div>
  </div>;
}
