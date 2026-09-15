import Link from "next/link";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import { getFeatureSummary, getMediaItems } from "@/lib/db";
import { getTravelSummaries } from "@/lib/travel-db";

export default async function AdminDashboard() {
  const [{ projects, features }, media, travel] = await Promise.all([
    getFeatureSummary(), getMediaItems(), getTravelSummaries().catch(() => null),
  ]);
  return <div>
    <div className="admin-page-header"><h1 className="admin-heading">总览</h1><div className="admin-actions">
      <Link href="/admin/projects/new" className="admin-btn admin-btn-secondary">新建作品</Link><Link href="/admin/travel/new" className="admin-btn">新建旅行</Link>
    </div></div>
    <div className="admin-stats">
      {([
        ["/admin/projects", "作品", projects.length], ["/admin/travel", "旅行", travel?.length ?? "—"],
        ["/admin/features", "首页精选", features.length], ["/admin/media", "媒体", media.length],
      ] as const).map(([href, label, count]) => <Link key={href} href={href} className="admin-stat-card"><span className="admin-stat-label">{label}</span><span className="admin-stat-number">{count}</span></Link>)}
    </div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel"><div className="admin-section-header"><h2 className="admin-subheading">作品</h2><Link href="/admin/projects" className="admin-btn-sm">全部作品</Link></div>
        <ul className="admin-dashboard-list">{projects.slice(0, 6).map(project => <li key={project.id}><Link href={`/admin/projects/${project.slug}`}>
          <AdminPreviewImage src={project.thumbUrl} alt="" width={72} height={50} /><strong>{project.titleZh}</strong>
          <span className={`admin-status-badge ${project.visible ? "is-live" : "is-draft"}`}>{project.visible ? "已发布" : "草稿"}</span>
        </Link></li>)}</ul>
        {!projects.length && <p className="admin-muted">暂无作品</p>}
      </section>
      <section className="admin-panel"><div className="admin-section-header"><h2 className="admin-subheading">旅行</h2><Link href="/admin/travel" className="admin-btn-sm">全部旅行</Link></div>
        <ul className="admin-dashboard-list">{travel?.slice(0, 6).map(journey => <li key={journey.id}><Link href={`/admin/travel/${journey.id}`}>
          <div><strong>{journey.title}</strong><div className="admin-muted">{journey.stopCount} 段正文 · {journey.pointCount.toLocaleString()} 个轨迹点</div></div>
          <span className={`admin-status-badge ${journey.visible ? "is-live" : "is-draft"}`}>{journey.visible ? "已发布" : "草稿"}</span>
        </Link></li>)}</ul>
        {travel === null ? <p className="admin-muted">旅行暂时无法加载</p> : !travel.length && <p className="admin-muted">暂无旅行</p>}
      </section>
    </div>
  </div>;
}
