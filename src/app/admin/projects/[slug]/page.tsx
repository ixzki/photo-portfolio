"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminImageField from "@/components/AdminImageField";
import { LAYOUT_OPTIONS, Image, LayoutType, Project } from "@/lib/types";

function RowImageAdder({ onAdd }: { onAdd: (image: Omit<Image, "id" | "order">) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [width, setWidth] = useState(1440);
  const [height, setHeight] = useState(960);
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!url) return;
    setSaving(true);
    await onAdd({ url, width, height, alt: alt || null });
    setSaving(false);
    setUrl("");
    setAlt("");
    setWidth(1440);
    setHeight(960);
  };

  return (
    <div className="admin-row-image-adder">
      <AdminImageField
        value={url}
        onChange={setUrl}
        onSize={(nextWidth, nextHeight) => {
          setWidth(nextWidth || 1440);
          setHeight(nextHeight || 960);
        }}
        placeholder="粘贴图片 URL"
      />
      <div className="admin-form-row">
        <input value={alt} onChange={(event) => setAlt(event.target.value)} className="admin-input" placeholder="描述" />
        <button type="button" onClick={handleAdd} disabled={!url || saving} className="admin-btn-sm">
          {saving ? "添加中..." : "添加图片"}
        </button>
      </div>
    </div>
  );
}

export default function EditProjectPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [newRowLayout, setNewRowLayout] = useState<LayoutType>("landscape");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showDimensions, setShowDimensions] = useState(false);

  useEffect(() => {
    fetch(`/api/projects?slug=${params.slug}`)
      .then((res) => res.json())
      .then((data) => setProject(data));
  }, [params.slug]);

  if (!project) return <p>加载中...</p>;

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2200);
  };

  const setProjectFromServer = (updated: Project) => {
    setProject((current) => (current ? { ...current, rows: updated.rows } : updated));
  };

  const handleSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/projects?id=${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    setSaving(false);

    if (!res.ok) {
      showMessage("保存失败");
      return;
    }

    const updated: Project = await res.json();
    setProject(updated);
    showMessage("保存成功");
    if (updated.slug !== params.slug) router.replace(`/admin/projects/${updated.slug}`);
  };

  const handleDelete = async () => {
    if (!confirm("确定删除此作品？此操作不可撤销。")) return;
    const res = await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/projects");
  };

  const handleAddRow = async () => {
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "addRow", layout: newRowLayout }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm("删除此行？")) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "deleteRow", rowId }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const handleUpdateRowLayout = async (rowId: string, layout: LayoutType) => {
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "updateRow", rowId, data: { layout } }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const handleAddImage = async (rowId: string, image: Omit<Image, "id" | "order">) => {
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "addImage", rowId, image }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const handleUpdateImage = async (rowId: string, imageId: string, data: Partial<Image>) => {
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "updateImage", rowId, imageId, data }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const handleDeleteImage = async (rowId: string, imageId: string) => {
    if (!confirm("删除此图片？")) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, action: "deleteImage", rowId, imageId }),
    });
    if (res.ok) setProjectFromServer(await res.json());
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setProject((current) => (current ? { ...current, [field]: value } : current));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="admin-heading" style={{ margin: 0 }}>编辑作品</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => handleSave()} disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存"}
          </button>
          <button onClick={handleDelete} className="admin-btn-sm admin-btn-danger">删除作品</button>
          {message && <span style={{ padding: "6px 12px", background: message.includes("失败") ? "#fed7d7" : "#c6f6d5", borderRadius: 4, fontSize: 13 }}>{message}</span>}
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-form">
        <h2 className="admin-subheading">基本信息</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>标识 (slug)</label>
            <input value={project.slug} onChange={(event) => updateField("slug", event.target.value)} required placeholder="my-project-slug" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>标题</label>
            <input value={project.titleZh} onChange={(event) => { updateField("titleZh", event.target.value); if (!project.slug) updateField("slug", "work-" + Date.now().toString(36)); }} required placeholder="我的作品" className="admin-input" />
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
              发布可见
            </label>
          </div>
        </div>

        <h2 className="admin-subheading">封面图片</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <AdminImageField
              label="封面图"
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
              label="缩略图"
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

        <div className="admin-section-title-row">
          <h2 className="admin-subheading">图片行 ({project.rows.length})</h2>
          <select value={newRowLayout} onChange={(event) => setNewRowLayout(event.target.value as LayoutType)} className="admin-input admin-layout-select">
            {LAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={handleAddRow} className="admin-btn-sm">添加行</button>
        </div>

        {project.rows.map((row) => (
          <div key={row.id} className="admin-project-row">
            <div className="admin-project-row-head">
              <div className="admin-row-layout-control">
                <select
                  value={row.layout}
                  onChange={(event) => handleUpdateRowLayout(row.id, event.target.value as LayoutType)}
                  className="admin-input admin-layout-select"
                >
                  {LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="admin-muted">
                  {LAYOUT_OPTIONS.find((option) => option.value === row.layout)?.desc}
                </span>
              </div>
              <button type="button" onClick={() => handleDeleteRow(row.id)} className="admin-btn-sm admin-btn-danger">删除行</button>
            </div>

            <RowImageAdder onAdd={(image) => handleAddImage(row.id, image)} />

            <div className="admin-image-grid">
              {row.images.map((image) => (
                <div key={image.id} className="admin-image-card">
                  <img className="loaded"  src={image.url} alt={image.alt || ""} />
                  <input
                    defaultValue={image.alt || ""}
                    onBlur={(event) => handleUpdateImage(row.id, image.id, { alt: event.target.value || null })}
                    className="admin-input"
                    placeholder="描述"
                  />
                  <div className="admin-image-meta">{image.width} × {image.height}</div>
                  <button type="button" onClick={() => handleDeleteImage(row.id, image.id)} className="admin-image-delete">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 24, paddingBottom: 40 }}>
          <button type="submit" disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存"}
          </button>
          <button type="button" onClick={handleDelete} className="admin-btn-sm admin-btn-danger">删除作品</button>
        </div>
      </form>
    </div>
  );
}