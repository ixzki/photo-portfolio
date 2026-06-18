import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DetailNextAction from "@/components/DetailNextAction";
import DetailImageFrame from "@/components/DetailImageFrame";
import DetailMotionTrigger from "@/components/DetailMotionTrigger";
import DetailProjectTitle from "@/components/DetailProjectTitle";
import ImageLoader from "@/components/ImageLoader";
import { getProjectDetailData, getProjects } from "@/lib/db";
import { Project, Row } from "@/lib/types";

export const revalidate = 300;

type DetailPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { project } = await getProjectDetailData(slug);
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
  const { project, nextProject } = await getProjectDetailData(slug);
  if (!project) notFound();

  return (
    <section className="view detail-page is-active" id="detail" data-view="detail" aria-label="项目详情">
      <DetailMotionTrigger />
      <div className="cover">
        <ImageLoader
          src={project.coverUrl}
          alt={project.titleZh}
          className="cover-image"
          priority
          width={project.coverW}
          height={project.coverH}
          sizes="100vw"
          variant="cover"
        />

        <DetailProjectTitle title={project.titleZh} />
      </div>

      <div className="detail-content">
        <aside className="project-info-sidebar">
          <ProjectInfo project={project} />
        </aside>

        <div className="album-container">
          {project.rows.map((row: Row, rowIndex) => (
            <div key={row.id} className={`detail-row ${row.layout}`}>
              {row.images.map((image, imageIndex) => (
                <DetailImageFrame
                  key={image.id}
                  image={image}
                  alt={project.titleZh}
                  delayIndex={rowIndex + imageIndex}
                />
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
