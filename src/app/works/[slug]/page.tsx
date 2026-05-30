import { notFound } from "next/navigation";
import DetailNextAction from "@/components/DetailNextAction";
import ImageLoader from "@/components/ImageLoader";
import { getProjects, getProjectBySlug } from "@/lib/db";
import { Project, Row } from "@/lib/types";

export const dynamic = "force-dynamic";

function ProjectInfo({ project, includeTitle = true }: { project: Project; includeTitle?: boolean }) {
  return (
    <div className="project-info">
      {includeTitle && <h2 className="project-title in-project-info">{project.titleZh}</h2>}
      <p>{project.design}</p>
      <p>{project.city}</p>
      <p>{project.time}</p>
      <p>{project.equipment}</p>
    </div>
  );
}

export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const allProjects = await getProjects();
  const currentIndex = allProjects.findIndex((p) => p.slug === slug);
  const nextProject = allProjects[(currentIndex + 1) % allProjects.length];

  return (
    <section className="view detail-page is-active" id="detail" data-view="detail" aria-label="项目详情">
      <div className="cover">
        <ImageLoader src={project.coverUrl} alt={project.titleZh} className="cover-image" priority />

        <div className="project-title-container">
          <h1 className="project-title">{project.titleZh}</h1>
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
                  <ImageLoader src={image.url} alt={image.alt || project.titleZh} className="detail-image" />
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

      <DetailNextAction nextProject={{ slug: nextProject.slug, titleZh: nextProject.titleZh }} />
    </section>
  );
}