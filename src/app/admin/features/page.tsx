"use client";

import { useState, useEffect } from "react";
import AdminImageField from "@/components/AdminImageField";
import type { FeatureItem } from "@/lib/types";

interface Project {
  id: string;
  slug: string;
  titleZh: string;
  coverUrl: string;
}

type FeatureCreatePayload = Omit<FeatureItem, "id">;

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"project" | "image">("project");
  const [newFeature, setNewFeature] = useState({
    projectSlug: "",
    projectTitle: "",
    projectCoverUrl: "",
    imageUrl: "",
    imageTitle: "",
  });

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setProjects(data);
    });
    fetch("/api/features").then((r) => r.json()).then(setFeatures);
  }, []);

  const loadFeatures = () => fetch("/api/features").then((r) => r.json()).then(setFeatures);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: FeatureCreatePayload = { type: addType, order: features.length };
    if (addType === "project") {
      body.projectSlug = newFeature.projectSlug;
      body.projectTitle = newFeature.projectTitle;
      body.projectCoverUrl = newFeature.projectCoverUrl;
    } else {
      body.imageUrl = newFeature.imageUrl;
      body.imageTitle = newFeature.imageTitle;
    }
    const res = await fetch("/api/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      await loadFeatures();
      setShowAdd(false);
      setNewFeature({ projectSlug: "", projectTitle: "", projectCoverUrl: "", imageUrl: "", imageTitle: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此项？")) return;
    await fetch(`/api/features?id=${id}`, { method: "DELETE" });
    await loadFeatures();
  };

  const moveUp = async (id: string) => {
    const idx = features.findIndex((f) => f.id === id);
    if (idx <= 0) return;
    const newIds = features.map((f) => f.id);
    [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
    await fetch("/api/features/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: newIds }) });
    await loadFeatures();
  };

  const moveDown = async (id: string) => {
    const idx = features.findIndex((f) => f.id === id);
    if (idx >= features.length - 1) return;
    const newIds = features.map((f) => f.id);
    [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
    await fetch("/api/features/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: newIds }) });
    await loadFeatures();
  };

  const handleProjectSelect = (slug: string) => {
    const p = projects.find((pr) => pr.slug === slug);
    if (p) {
      setNewFeature((prev) => ({ ...prev, projectSlug: p.slug, projectTitle: p.titleZh, projectCoverUrl: p.coverUrl }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="admin-heading" style={{ margin: 0 }}>首页精选</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="admin-btn">
          {showAdd ? "取消" : "+ 添加精选"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px" }}>新增首页项</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={addType === "project"} onChange={() => setAddType("project")} /> 关联项目（可点击打开详情页）
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" checked={addType === "image"} onChange={() => setAddType("image")} /> 单张图片（仅展示标题）
            </label>
          </div>

          <form onSubmit={handleAdd}>
            {addType === "project" ? (
              <>
                <div className="admin-form-group">
                  <label>选择项目</label>
                  <select
                    className="admin-input"
                    value={newFeature.projectSlug}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    required
                  >
                    <option value="">-- 请选择 --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.slug}>{p.titleZh}</option>
                    ))}
                  </select>
                </div>
                {newFeature.projectSlug && (
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <img className="loaded"  src={newFeature.projectCoverUrl} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 4 }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{newFeature.projectTitle}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#718096" }}>slug: {newFeature.projectSlug}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="admin-form-group">
                  <AdminImageField
                    label="图片"
                    value={newFeature.imageUrl}
                    onChange={(value) => setNewFeature((p) => ({ ...p, imageUrl: value }))}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>显示标题</label>
                  <input className="admin-input" value={newFeature.imageTitle} onChange={(e) => setNewFeature((p) => ({ ...p, imageTitle: e.target.value }))} placeholder="标题文字" required />
                </div>
              </>
            )}
            <button type="submit" className="admin-btn" style={{ marginTop: 16 }}>确认添加</button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {features.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => moveUp(item.id)} disabled={idx === 0} className="admin-btn-sm" style={{ padding: "2px 8px", fontSize: 11 }}>↑</button>
              <button onClick={() => moveDown(item.id)} disabled={idx === features.length - 1} className="admin-btn-sm" style={{ padding: "2px 8px", fontSize: 11 }}>↓</button>
            </div>
            <span style={{ fontSize: 13, color: "#718096", minWidth: 30 }}>#{item.order}</span>
            <img className="loaded" 
              src={item.type === "project" ? item.projectCoverUrl : item.imageUrl}
              alt=""
              style={{ width: 80, height: 53, objectFit: "cover", borderRadius: 4 }}
            />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {item.type === "project" ? item.projectTitle : item.imageTitle}
              </span>
              <span style={{
                marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 11,
                background: item.type === "project" ? "#ebf8ff" : "#faf5ff",
                color: item.type === "project" ? "#2b6cb0" : "#6b46c1",
              }}>
                {item.type === "project" ? "关联项目" : "单张图片"}
              </span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="admin-btn-sm" style={{ background: "#e53e3e" }}>删除</button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#a0aec0", marginTop: 12 }}>
        首页按上方顺序从左到右展示。拖动顺序通过 ↑ ↓ 按钮调整。
        <br />&quot;关联项目&quot;：点击后跳转到作品详情页；&quot;单张图片&quot;：仅展示图片和标题，不可点击。
      </p>
    </div>
  );
}
