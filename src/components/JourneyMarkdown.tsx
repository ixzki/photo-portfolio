import Markdown from "react-markdown";
import { journeyMarkdownOptions } from "@/lib/journey-markdown";
import styles from "./JourneyMarkdown.module.css";

export default function JourneyMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className={styles.markdown}>
      <Markdown {...journeyMarkdownOptions} components={{
        img: ({ src, alt, title }) => typeof src === "string" && src ? (
          // eslint-disable-next-line @next/next/no-img-element -- Markdown images do not require fixed dimensions.
          <img src={src} alt={alt ?? ""} title={title} loading="lazy" decoding="async" />
        ) : null,
        a: ({ href, children }) => href ? <a href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
        table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
      }}>{markdown}</Markdown>
    </div>
  );
}
