import Link from "next/link";
import { getAllProjects, getFeatures } from "@/lib/db";

export default async function AdminDashboard() {
  const projects = await getAllProjects();
  const features = await getFeatures();
  const visible = projects.filter((project) => project.visible).length;
  const hidden = projects.filter((project) => !project.visible).length;

  return (
    <div>
      <h1 className="admin-heading">总览</h1>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-number">{projects.length}</span>
          <span className="admin-stat-label">项目总数</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-number">{visible}</span>
          <span className="admin-stat-label">已发布</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-number">{hidden}</span>
          <span className="admin-stat-label">已隐藏</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-number">{features.length}</span>
          <span className="admin-stat-label">首页项</span>
        </div>
      </div>

      <h2 className="admin-subheading">项目列表</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>排序</th>
            <th>封面</th>
            <th>标题</th>
            <th>分类</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{project.order}</td>
              <td><img className="loaded" src={project.thumbUrl} alt={project.titleZh} style={{ width: 60, height: 40, objectFit: "cover" }} /></td>
              <td>{project.titleZh}</td>
              <td>{project.design}</td>
              <td>{project.visible ? "发布" : "隐藏"}</td>
              <td><Link href={`/admin/projects/${project.slug}`} className="admin-btn-sm">编辑</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
