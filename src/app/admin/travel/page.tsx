import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getTravelSummaries, isTravelTableMissing } from "@/lib/travel-db";
import type { TravelSummary } from "@/lib/travel-content";
import { formatJourneyTime } from "@/lib/journey-metadata";
import styles from "./travel-admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminTravelPage() {
  if (!await isAuthenticated()) return null;
  let journeys: TravelSummary[] = [];
  let errorMessage = "";
  try { journeys = await getTravelSummaries(); }
  catch (error) {
    errorMessage = isTravelTableMissing(error)
      ? "旅行内容尚未初始化。请在项目目录运行 node scripts/migrate-travel.mjs。"
      : "旅行列表暂时无法加载，请稍后刷新。";
  }
  return (
    <div className={styles.page}>
      <div className="admin-page-header">
        <h1 className="admin-heading" style={{ margin: 0 }}>旅行管理</h1>
        <Link href="/admin/travel/new" className="admin-btn">+ 新建旅行</Link>
      </div>
      {errorMessage ? <p role="alert" className="admin-message is-error">{errorMessage}</p> : journeys.length === 0 ? <p>暂无旅行。新建旅行后，可导入 CSV 并编辑路线和正文。</p> : (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="旅行列表，可左右滚动">
          <table className="admin-table">
            <thead><tr><th>标题</th><th>正文</th><th>轨迹点</th><th>状态</th><th>最近修改</th><th>操作</th></tr></thead>
            <tbody>{journeys.map((journey) => (
              <tr key={journey.id}>
                <td><Link href={`/admin/travel/${journey.id}`}>{journey.title}</Link></td>
                <td>{journey.stopCount} 段</td><td>{journey.pointCount.toLocaleString("zh-CN")}</td>
                <td><span className={`admin-status-badge ${journey.visible ? "is-live" : "is-draft"}`}>{journey.visible ? "已发布" : "草稿"}</span></td>
                <td>{formatJourneyTime(Date.parse(journey.updatedAt) / 1000)}</td>
                <td><div className="admin-row-actions">
                  <Link href={`/admin/travel/${journey.id}`} className="admin-btn-sm">编辑</Link>
                  {journey.visible && <Link href={`/travel/${journey.slug}`} className="admin-btn-sm">查看</Link>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
