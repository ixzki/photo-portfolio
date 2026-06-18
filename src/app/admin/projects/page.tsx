import Link from "next/link";
import AdminProjectsTable from "@/components/AdminProjectsTable";
import { getFeatureSummary } from "@/lib/db";

export default async function AdminProjectsPage() {
  const { projects, features } = await getFeatureSummary();

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
