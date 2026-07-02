"use client";

import { useEffect, useMemo, useState } from "react";
import AdminImageField from "@/components/AdminImageField";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import type { FeatureItem } from "@/lib/types";

interface ProjectOption {
  id: string;
  slug: string;
  titleZh: string;
  featureUrl?: string;
  coverUrl: string;
  visible: boolean;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createClientId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function reindexFeatures(items: FeatureItem[]) {
  return items.map((item, order) => ({ ...item, order }));
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"project" | "image">("project");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [newFeature, setNewFeature] = useState({
    projectSlug: "",
    projectTitle: "",
    projectCoverUrl: "",
    imageUrl: "",
    imageTitle: "",
  });

  const projectBySlug = useMemo(() => new Map(projects.map((project) => [project.slug, project])), [projects]);

  useEffect(() => {
    let active = true;
    fetch("/api/projects").then((r) => r.json()).then((data) => {
      if (active && Array.isArray(data)) setProjects(data);
    });
    fetch("/api/features").then((r) => r.json()).then((data) => {
      if (active && Array.isArray(data)) {
        setFeatures(data);
        setDirty(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const showTransientMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2000);
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    let feature: FeatureItem;

    if (addType === "project") {
      const project = projectBySlug.get(newFeature.projectSlug);
      if (!project) {
        setMessage("请选择关联项目。");
        return;
      }
      feature = {
        id: createClientId("feature"),
        type: "project",
        projectSlug: project.slug,
        projectTitle: project.titleZh,
        projectCoverUrl: project.featureUrl || project.coverUrl,
        order: features.length,
      };
    } else {
      if (!isHttpUrl(newFeature.imageUrl)) {
        setMessage("请填写有效的图片 URL。");
        return;
      }
      if (!newFeature.imageTitle.trim()) {
        setMessage("请填写显示标题。");
        return;
      }
      feature = {
        id: createClientId("feature"),
        type: "image",
        imageUrl: newFeature.imageUrl,
        imageTitle: newFeature.imageTitle,
        order: features.length,
      };
    }

    setFeatures((current) => reindexFeatures([...current, feature]));
    setDirty(true);
    setShowAdd(false);
    setNewFeature({ projectSlug: "", projectTitle: "", projectCoverUrl: "", imageUrl: "", imageTitle: "" });
    showTransientMessage("已添加精选，记得保存");
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除此项？")) return;
    setFeatures((current) => reindexFeatures(current.filter((feature) => feature.id !== id)));
    setDirty(true);
    showTransientMessage("已删除精选，记得保存");
  };

  const handleSave = async () => {
    setSaving(true);
    const nextFeatures = reindexFeatures(features);
    const res = await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", features: nextFeatures }),
    });
    setSaving(false);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "保存失败" }));
      showTransientMessage(error.error || "保存失败");
      return;
    }

    const updated: FeatureItem[] = await res.json();
    setFeatures(updated);
    setDirty(false);
    showTransientMessage("精选已保存");
  };

  const moveDraggedBefore = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const current = [...features];
    const from = current.findIndex((feature) => feature.id === draggedId);
    const to = current.findIndex((feature) => feature.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setFeatures(current);
  };

  const finishDrag = () => {
    setDraggedId(null);
    setFeatures((current) => reindexFeatures(current));
    setDirty(true);
  };

  const handleProjectSelect = (slug: string) => {
    const project = projects.find((item) => item.slug === slug);
    if (!slug) {
      setNewFeature((prev) => ({
        ...prev,
        projectSlug: "",
        projectTitle: "",
        projectCoverUrl: "",
      }));
      return;
    }
    if (!project) return;
    setNewFeature((prev) => ({
      ...prev,
      projectSlug: project.slug,
      projectTitle: project.titleZh,
      projectCoverUrl: project.featureUrl || project.coverUrl,
    }));
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-heading" style={{ margin: 0 }}>首页精选</h1>
        <div className="admin-actions">
          {message
            ? <span className={`admin-message${message.includes("失败") || message.includes("请") ? " is-error" : ""}`}>{message}</span>
            : dirty && <span className="admin-message">有未保存更改</span>}
          <button type="button" onClick={handleSave} disabled={saving || !dirty} className="admin-btn">
            {saving ? "保存中..." : "保存精选"}
          </button>
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="admin-btn">
            {showAdd ? "取消" : "+ 添加精选"}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="admin-panel">
          <h3>新增首页项</h3>
          <div className="admin-segmented">
            <label>
              <input type="radio" checked={addType === "project"} onChange={() => setAddType("project")} />
              关联项目
            </label>
            <label>
              <input type="radio" checked={addType === "image"} onChange={() => setAddType("image")} />
              单张图片
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
                    onChange={(event) => handleProjectSelect(event.target.value)}
                    required
                  >
                    <option value="">-- 请选择 --</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.slug}>
                        {project.titleZh} {project.visible ? "" : "（草稿）"}
                      </option>
                    ))}
                  </select>
                </div>
                {newFeature.projectSlug && (
                  <div className="admin-feature-preview">
                    <AdminPreviewImage src={newFeature.projectCoverUrl} alt="" width={220} height={165} sizes="220px" />
                    <div>
                      <p>{newFeature.projectTitle}</p>
                      <span className={`admin-status-badge ${projectBySlug.get(newFeature.projectSlug)?.visible ? "is-live" : "is-draft"}`}>
                        {projectBySlug.get(newFeature.projectSlug)?.visible ? "已发布" : "草稿"}
                      </span>
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
                    onChange={(value) => setNewFeature((current) => ({ ...current, imageUrl: value }))}
                  />
                </div>
                <div className="admin-form-group">
                  <label>显示标题</label>
                  <input
                    className="admin-input"
                    value={newFeature.imageTitle}
                    onChange={(event) => setNewFeature((current) => ({ ...current, imageTitle: event.target.value }))}
                    required
                  />
                </div>
              </>
            )}
            <button type="submit" className="admin-btn">确认添加</button>
          </form>
        </div>
      )}

      <div className="admin-feature-list">
        {features.map((item, index) => {
          const project = item.type === "project" && item.projectSlug ? projectBySlug.get(item.projectSlug) : null;
          return (
            <div
              key={item.id}
              onDragOver={(event) => {
                if (!draggedId || draggedId === item.id) return;
                event.preventDefault();
                moveDraggedBefore(item.id);
              }}
              className={`admin-feature-card${draggedId === item.id ? " admin-dragging" : ""}`}
            >
              <span
                className="admin-drag-handle"
                draggable
                title="拖动排序"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedId(item.id);
                }}
                onDragEnd={finishDrag}
              >
                ::
              </span>
              <span className="admin-muted">#{index}</span>
              <AdminPreviewImage
                src={item.type === "project" ? item.projectCoverUrl || "" : item.imageUrl || ""}
                alt=""
                width={220}
                height={165}
                sizes="220px"
              />
              <div className="admin-feature-card-body">
                <strong>{item.type === "project" ? item.projectTitle : item.imageTitle}</strong>
                <div>
                  <span className="admin-status-badge is-featured">{item.type === "project" ? "关联项目" : "单张图片"}</span>
                  {project && (
                    <span className={`admin-status-badge ${project.visible ? "is-live" : "is-draft"}`}>
                      {project.visible ? "公开可见" : "草稿不公开"}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="admin-btn-sm admin-btn-danger">删除</button>
            </div>
          );
        })}
      </div>
      <p className="admin-muted" style={{ marginTop: 12 }}>拖动精选项即可调整首页从左到右的展示顺序。</p>
    </div>
  );
}
