"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminImageField from "@/components/AdminImageField";
import AdminProjectRowsEditor from "@/components/AdminProjectRowsEditor";
import { FeatureItem, Image, LayoutType, Project } from "@/lib/types";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProject(project: Project) {
  const errors: string[] = [];
  if (!project.slug.trim()) errors.push("请填写 slug。");
  if (project.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    errors.push("slug 只能使用小写字母、数字和连字符。");
  }
  if (!project.titleZh.trim()) errors.push("请填写标题。");
  if (project.featureUrl?.trim() && !isHttpUrl(project.featureUrl)) errors.push("请填写有效的首页精选图 URL。");
  if (!isHttpUrl(project.coverUrl)) errors.push("请填写有效的封面图 URL。");
  if (!isHttpUrl(project.thumbUrl)) errors.push("请填写有效的缩略图 URL。");
  return errors;
}

function moveById<T extends { id: string }>(items: T[], draggedId: string, targetId: string): T[] {
  if (draggedId === targetId) return items;
  const next = [...items];
  const from = next.findIndex((item) => item.id === draggedId);
  const to = next.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0) return items;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function EditProjectPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [newRowLayout, setNewRowLayout] = useState<LayoutType>("landscape");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showDimensions, setShowDimensions] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [draggedImage, setDraggedImage] = useState<{ rowId: string; imageId: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects?slug=${params.slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.id) setProject(data);
        else setMessage(data?.error || "作品不存在");
      });
    fetch("/api/features").then((res) => res.json()).then((data) => {
      if (Array.isArray(data)) setFeatures(data);
    });
  }, [params.slug]);

  const isFeatured = useMemo(
    () => Boolean(project && features.some((feature) => feature.type === "project" && feature.projectSlug === project.slug)),
    [features, project],
  );
  const projectId = project?.id;
  const projectRows = useMemo(() => project?.rows ?? [], [project?.rows]);

  const showMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2400);
  }, []);

  const setProjectFromServer = useCallback((updated: Project) => {
    setProject(updated);
  }, []);

  const updateRowLayoutInState = useCallback((rowId: string, layout: LayoutType) => {
    setProject((current) => (
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.id === rowId ? { ...row, layout } : row)),
          }
        : current
    ));
  }, []);

  const updateField = useCallback((field: keyof Project, value: string | number | boolean) => {
    setProject((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const handleSave = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!project) return;
    const errors = validateProject(project);
    if (errors.length) {
      showMessage(errors[0]);
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/projects?id=${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    setSaving(false);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "保存失败" }));
      showMessage(error.error || "保存失败");
      return;
    }

    const updated: Project = await res.json();
    setProject(updated);
    showMessage("保存成功");
    if (updated.slug !== params.slug) router.replace(`/admin/projects/${updated.slug}`);
  }, [params.slug, project, router, showMessage]);

  const handleDelete = useCallback(async () => {
    if (!project) return;
    if (!confirm("确定删除此作品？此操作不可撤销，关联首页精选也会被移除。")) return;
    const res = await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/projects");
  }, [project, router]);

  const handleAddRow = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "addRow", layout: newRowLayout }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "请先提供在线数据库链接 DATABASE_URL。" }));
      showMessage(error.error || "添加行失败");
      return;
    }
    setProjectFromServer(await res.json());
  }, [newRowLayout, projectId, setProjectFromServer, showMessage]);

  const handleDeleteRow = useCallback(async (rowId: string) => {
    if (!projectId) return;
    if (!confirm("删除此行？")) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "deleteRow", rowId }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  }, [projectId, setProjectFromServer]);

  const handleUpdateRowLayout = useCallback(async (rowId: string, layout: LayoutType) => {
    if (!projectId) return;
    const previousLayout = projectRows.find((row) => row.id === rowId)?.layout;
    updateRowLayoutInState(rowId, layout);

    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "updateRow", rowId, data: { layout } }),
    });

    if (!res.ok) {
      if (previousLayout) updateRowLayoutInState(rowId, previousLayout);
      const error = await res.json().catch(() => ({ error: "行形式保存失败" }));
      showMessage(error.error || "行形式保存失败");
      return;
    }

    setProjectFromServer(await res.json());
    showMessage("行形式已保存");
  }, [projectId, projectRows, setProjectFromServer, showMessage, updateRowLayoutInState]);

  const handleAddImage = useCallback(async (rowId: string, image: Omit<Image, "id" | "order">) => {
    if (!projectId) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "addImage", rowId, image }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "添加失败" }));
      showMessage(error.error || "添加失败");
      return;
    }
    setProjectFromServer(await res.json());
  }, [projectId, setProjectFromServer, showMessage]);

  const handleUpdateImage = useCallback(async (rowId: string, imageId: string, data: Partial<Image>) => {
    if (!projectId) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "updateImage", rowId, imageId, data }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  }, [projectId, setProjectFromServer]);

  const handleDeleteImage = useCallback(async (rowId: string, imageId: string) => {
    if (!projectId) return;
    if (!confirm("删除此图片？")) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "deleteImage", rowId, imageId }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  }, [projectId, setProjectFromServer]);

  const moveRowBefore = useCallback((targetRowId: string) => {
    if (!draggedRowId) return;
    setProject((current) => {
      if (!current) return current;
      return { ...current, rows: moveById(current.rows, draggedRowId, targetRowId) };
    });
  }, [draggedRowId]);

  const persistRowOrder = useCallback(async () => {
    if (!projectId) return;
    setDraggedRowId(null);
    const rowIds = projectRows.map((row) => row.id);
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "reorderRows", rowIds }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  }, [projectId, projectRows, setProjectFromServer]);

  const moveImageBefore = useCallback((rowId: string, targetImageId: string) => {
    if (!draggedImage || draggedImage.rowId !== rowId) return;
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map((row) => (
          row.id === rowId ? { ...row, images: moveById(row.images, draggedImage.imageId, targetImageId) } : row
        )),
      };
    });
  }, [draggedImage]);

  const persistImageOrder = useCallback(async (rowId: string) => {
    if (!projectId) return;
    setDraggedImage(null);
    const row = projectRows.find((item) => item.id === rowId);
    if (!row) return;
    const imageIds = row.images.map((image) => image.id);
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action: "reorderImages", rowId, imageIds }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  }, [projectId, projectRows, setProjectFromServer]);

  const handleNewRowLayoutChange = useCallback((layout: LayoutType) => {
    setNewRowLayout(layout);
  }, []);

  const handleRowDragStart = useCallback((rowId: string) => {
    setDraggedRowId(rowId);
  }, []);

  const handleImageDragStart = useCallback((rowId: string, imageId: string) => {
    setDraggedImage({ rowId, imageId });
  }, []);

  const handleUpdateImageAlt = useCallback((rowId: string, imageId: string, alt: string) => {
    void handleUpdateImage(rowId, imageId, { alt: alt || null });
  }, [handleUpdateImage]);

  if (!project) return <p>加载中...</p>;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-heading" style={{ margin: 0 }}>编辑作品</h1>
          <div style={{ marginTop: 8 }}>
            <span className={`admin-status-badge ${project.visible ? "is-live" : "is-draft"}`}>
              {project.visible ? "已发布" : "草稿"}
            </span>
            {isFeatured && <span className="admin-status-badge is-featured">首页精选中</span>}
          </div>
        </div>
        <div className="admin-actions">
          {project.visible && <Link href={`/works/${project.slug}`} className="admin-btn-sm">预览</Link>}
          <button onClick={() => handleSave()} disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={handleDelete} className="admin-btn-sm admin-btn-danger">删除作品</button>
          {message && <span className={`admin-message${message.includes("失败") || message.includes("请") || message.includes("slug") ? " is-error" : ""}`}>{message}</span>}
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-form">
        <h2 className="admin-subheading">基本信息</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>标识 slug</label>
            <input value={project.slug} onChange={(event) => updateField("slug", event.target.value)} required placeholder="my-project-slug" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>标题</label>
            <input value={project.titleZh} onChange={(event) => updateField("titleZh", event.target.value)} required placeholder="我的作品" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>分类</label>
            <input value={project.design} onChange={(event) => updateField("design", event.target.value)} placeholder="建筑摄影" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>城市</label>
            <input value={project.city} onChange={(event) => updateField("city", event.target.value)} placeholder="上海" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>时间</label>
            <input value={project.time} onChange={(event) => updateField("time", event.target.value)} placeholder="2024 / 已完成" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>器材</label>
            <input value={project.equipment} onChange={(event) => updateField("equipment", event.target.value)} placeholder="Sony A7R5 + 24-70mm" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>排序</label>
            <input value={project.order} onChange={(event) => updateField("order", Number(event.target.value) || 0)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group" style={{ alignSelf: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={project.visible} onChange={(event) => updateField("visible", event.target.checked)} style={{ width: "auto" }} />
              公开发布
            </label>
          </div>
        </div>

        <h2 className="admin-subheading">展示图片</h2>
        <div className="admin-form-row admin-image-form-row">
          <div className="admin-form-group">
            <AdminImageField
              label="首页精选图"
              value={project.featureUrl || project.coverUrl}
              onChange={(value) => updateField("featureUrl", value)}
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="详情首屏大图"
              value={project.coverUrl}
              onChange={(value) => updateField("coverUrl", value)}
              onSize={(width, height) => {
                updateField("coverW", width || project.coverW);
                updateField("coverH", height || project.coverH);
              }}
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="Works 缩略图"
              value={project.thumbUrl}
              onChange={(value) => updateField("thumbUrl", value)}
              onSize={(width, height) => {
                updateField("thumbW", width || project.thumbW);
                updateField("thumbH", height || project.thumbH);
              }}
            />
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setShowDimensions(!showDimensions)} className="admin-btn-sm" style={{ marginBottom: showDimensions ? 12 : 0 }}>
            {showDimensions ? "收起尺寸" : "展开尺寸"}
          </button>
          {showDimensions && (
            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div className="admin-form-group">
                <label>封面宽度</label>
                <input type="number" value={project.coverW} onChange={(event) => updateField("coverW", Number(event.target.value) || 1440)} className="admin-input" />
              </div>
              <div className="admin-form-group">
                <label>封面高度</label>
                <input type="number" value={project.coverH} onChange={(event) => updateField("coverH", Number(event.target.value) || 960)} className="admin-input" />
              </div>
              <div className="admin-form-group">
                <label>缩略图宽度</label>
                <input type="number" value={project.thumbW} onChange={(event) => updateField("thumbW", Number(event.target.value) || 1200)} className="admin-input" />
              </div>
              <div className="admin-form-group">
                <label>缩略图高度</label>
                <input type="number" value={project.thumbH} onChange={(event) => updateField("thumbH", Number(event.target.value) || 800)} className="admin-input" />
              </div>
            </div>
          )}
        </div>

        <AdminProjectRowsEditor
          rows={project.rows}
          newRowLayout={newRowLayout}
          draggedRowId={draggedRowId}
          draggedImage={draggedImage}
          onNewRowLayoutChange={handleNewRowLayoutChange}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onUpdateRowLayout={handleUpdateRowLayout}
          onRowDragStart={handleRowDragStart}
          onRowDragOver={moveRowBefore}
          onRowDragEnd={persistRowOrder}
          onAddImage={handleAddImage}
          onImageDragStart={handleImageDragStart}
          onImageDragOver={moveImageBefore}
          onImageDragEnd={persistImageOrder}
          onUpdateImageAlt={handleUpdateImageAlt}
          onDeleteImage={handleDeleteImage}
        />

        <div className="admin-actions admin-form-actions">
          <button type="submit" disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存"}
          </button>
          <button type="button" onClick={handleDelete} className="admin-btn-sm admin-btn-danger">删除作品</button>
        </div>
      </form>
    </div>
  );
}
