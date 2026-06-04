"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeatureItem, Project } from "@/lib/types";

export default function AdminProjectsTable({
  projects,
  features,
}: {
  projects: Project[];
  features: FeatureItem[];
}) {
  const [items, setItems] = useState(projects);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const featuredSlugs = new Set(features.filter((item) => item.type === "project").map((item) => item.projectSlug));

  const persistOrder = async (nextItems: Project[]) => {
    setMessage("排序保存中...");
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorderProjects", ids: nextItems.map((item) => item.id) }),
    });

    if (!res.ok) {
      setMessage("排序保存失败");
      return;
    }

    const updated: Project[] = await res.json();
    const orderById = new Map(updated.map((item) => [item.id, item.order]));
    setItems((current) => current.map((item) => ({ ...item, order: orderById.get(item.id) ?? item.order })));
    setMessage("排序已保存");
    window.setTimeout(() => setMessage(""), 1800);
  };

  const moveDraggedBefore = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const current = [...items];
    const from = current.findIndex((item) => item.id === draggedId);
    const to = current.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setItems(current);
  };

  const endDrag = async () => {
    setDraggedId(null);
    await persistOrder(items);
  };

  return (
    <div>
      <div className="admin-actions" style={{ marginBottom: 12 }}>
        {message && <span className={`admin-message${message.includes("失败") ? " is-error" : ""}`}>{message}</span>}
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
          {items.map((project, index) => (
            <tr
              key={project.id}
              onDragOver={(event) => {
                if (!draggedId || draggedId === project.id) return;
                event.preventDefault();
                moveDraggedBefore(project.id);
              }}
              className={draggedId === project.id ? "admin-dragging" : ""}
            >
              <td>
                <span
                  className="admin-drag-handle"
                  draggable
                  title="拖动排序"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedId(project.id);
                  }}
                  onDragEnd={() => void endDrag()}
                >
                  ::
                </span>{" "}
                {index}
              </td>
              <td><img className="loaded admin-table-thumb" src={project.thumbUrl} alt={project.titleZh} /></td>
              <td><strong>{project.titleZh}</strong></td>
              <td>{project.design}</td>
              <td>{project.city}</td>
              <td>
                <span className={`admin-status-badge ${project.visible ? "is-live" : "is-draft"}`}>
                  {project.visible ? "已发布" : "草稿"}
                </span>
                {featuredSlugs.has(project.slug) && <span className="admin-status-badge is-featured">首页精选</span>}
              </td>
              <td>
                <div className="admin-row-actions">
                  <Link href={`/admin/projects/${project.slug}`} className="admin-btn-sm">编辑</Link>
                  {project.visible && <Link href={`/works/${project.slug}`} className="admin-btn-sm">预览</Link>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="admin-muted" style={{ marginTop: 10 }}>拖动表格行即可调整作品顺序。</p>
    </div>
  );
}
