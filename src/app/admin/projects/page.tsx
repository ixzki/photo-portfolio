import Link from "next/link";
import { getAllProjects } from "@/lib/db";

export default async function AdminProjectsPage() {
  const projects = await getAllProjects();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="admin-heading" style={{ margin: 0 }}>作品管理</h1>
        <Link href="/admin/projects/new" className="admin-btn">+ 新建作品</Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>排序</th>
            <th>封面</th>
            <th>标题</th>
            <th>分类</th>
            <th>城市</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.order}</td>
              <td><img className="loaded"  src={p.thumbUrl} alt={p.titleZh} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4 }} /></td>
              <td><strong>{p.titleZh}</strong></td>
              <td>{p.design}</td>
              <td>{p.city}</td>
              <td>{p.visible ? "✅" : "👁"}</td>
              <td><Link href={`/admin/projects/${p.slug}`} className="admin-btn-sm">编辑</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
