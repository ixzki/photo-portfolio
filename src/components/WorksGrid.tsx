import Link from "next/link";
import ImageLoader from "./ImageLoader";
import { Project } from "@/lib/types";

export default function WorksGrid({ projects }: { projects: Project[] }) {
  return (
    <section className="view works-page is-active" id="works" data-view="works" aria-label="作品列表">
      <div className="works-content">
        <div className="works-grid">
          {projects.map((project) => (
            <Link
              key={project.id}
              className="works-item"
              href={`/works/${project.slug}`}
              aria-label={`查看项目：${project.titleZh}`}
            >
              <div
                className="works-item-image-container"
                style={{ aspectRatio: `${project.thumbW} / ${project.thumbH}` }}
              >
                <ImageLoader
                  src={project.thumbUrl}
                  alt={project.titleZh}
                  className="works-item-image"
                  width={project.thumbW}
                  height={project.thumbH}
                  sizes="(orientation: portrait) 50vw, 25vw"
                  variant="thumb"
                />
              </div>
              <div className="works-item-text">
                <h2 className="works-item-title hover-invert">{project.titleZh}</h2>
                <h3 className="works-item-subtitle hover-invert">
                  {project.design} / {project.city}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
