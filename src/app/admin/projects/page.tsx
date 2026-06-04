import Link from "next/link";
import AdminProjectsTable from "@/components/AdminProjectsTable";
import { getAllProjects, getFeatures } from "@/lib/db";

export default async function AdminProjectsPage() {
  const [projects, features] = await Promise.all([getAllProjects(), getFeatures()]);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-heading" style={{ margin: 0 }}>作品管理</h1>
        <Link href="/admin/projects/new" className="admin-btn">+ 新建作品</Link>
      </div>
      <AdminProjectsTable projects={projects} features={features} />
    </div>
  );
}
