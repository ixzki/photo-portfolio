import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DetailNextAction from "@/components/DetailNextAction";
import ImageLoader from "@/components/ImageLoader";
import { getProjects, getVisibleProjectBySlug } from "@/lib/db";
import { Project, Row } from "@/lib/types";

export const dynamic = "force-dynamic";

type DetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getVisibleProjectBySlug(slug);
  if (!project) {
    return {
      title: "作品未找到",
      robots: { index: false, follow: false },
    };
  }

  const description = [project.design, project.city, project.time, project.equipment]
    .filter(Boolean)
    .join(" / ");

  return {
    title: project.titleZh,
    description,
    openGraph: {
      title: project.titleZh,
      description,
      type: "article",
      images: [
        {
          url: project.coverUrl,
          width: project.coverW,
          height: project.coverH,
          alt: project.titleZh,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.titleZh,
      description,
      images: [project.coverUrl],
    },
  };
}

function ProjectInfo({ project, includeTitle = true }: { project: Project; includeTitle?: boolean }) {
  return (
    <div className="project-info">
      {includeTitle && <h2 className="project-title in-project-info hover-invert is-active">{project.titleZh}</h2>}
      <p>{project.design}</p>
      <p>{project.city}</p>
      <p>{project.time}</p>
      <p>{project.equipment}</p>
    </div>
  );
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const project = await getVisibleProjectBySlug(slug);
  if (!project) notFound();

  const allProjects = await getProjects();
  const currentIndex = allProjects.findIndex((p) => p.slug === slug);
  const nextProject = allProjects.length > 0
    ? allProjects[(currentIndex >= 0 ? currentIndex + 1 : 0) % allProjects.length]
    : null;

  return (
    <section className="view detail-page is-active" id="detail" data-view="detail" aria-label="项目详情">
      <div className="cover">
        <ImageLoader
          src={project.coverUrl}
          alt={project.titleZh}
          className="cover-image"
          priority
          width={project.coverW}
          height={project.coverH}
          sizes="100vw"
        />

        <div className="project-title-container">
          <h1 className="project-title hover-invert is-active">{project.titleZh}</h1>
        </div>
      </div>

      <div className="detail-content">
        <aside className="project-info-sidebar">
          <ProjectInfo project={project} />
        </aside>

        <div className="album-container">
          {project.rows.map((row: Row) => (
            <div key={row.id} className={`detail-row ${row.layout}`}>
              {row.images.map((image) => (
                <figure key={image.id} className="detail-image-frame" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
                  <ImageLoader
                    src={image.url}
                    alt={image.alt || project.titleZh}
                    className="detail-image"
                    width={image.width}
                    height={image.height}
                    sizes="(orientation: portrait) 100vw, 70vw"
                  />
                </figure>
              ))}
            </div>
          ))}
        </div>

        <div className="project-footer-container">
          <div className="project-footer-info">
            <ProjectInfo project={project} includeTitle={false} />
          </div>
        </div>
      </div>

      {nextProject && <DetailNextAction nextProject={{ slug: nextProject.slug, titleZh: nextProject.titleZh }} />}
    </section>
  );
}
