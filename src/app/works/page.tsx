import { getProjects } from "@/lib/db";
import WorksGrid from "@/components/WorksGrid";

export const revalidate = 300;

export default async function WorksPage() {
  const projects = await getProjects();
  return <WorksGrid projects={projects} />;
}
