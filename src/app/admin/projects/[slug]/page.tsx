import { notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getFeatures, getProjectBySlug } from "@/lib/db";
import { isReadOnlyPreview } from "@/lib/preview-config.mjs";
import AdminProjectEditor from "@/components/AdminProjectEditor";

export const metadata = { title: "编辑作品" };

export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAuthenticated())) return null;
  const { slug } = await params;
  const [project, features] = await Promise.all([getProjectBySlug(slug), getFeatures()]);
  if (!project) notFound();
  return <AdminProjectEditor key={project.id} initial={project} readOnly={isReadOnlyPreview()}
    isFeatured={features.some((feature) => feature.type === "project" && feature.projectSlug === project.slug)} />;
}
