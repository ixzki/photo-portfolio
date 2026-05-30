"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminImageField from "@/components/AdminImageField";

const initialDraft = {
  slug: "",
  titleZh: "",
  design: "",
  city: "",
  time: "",
  equipment: "",
  order: "0",
  visible: true,
  coverUrl: "",
  thumbUrl: "",
  coverW: "1440",
  coverH: "960",
  thumbW: "1200",
  thumbH: "800",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (field: keyof typeof initialDraft, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/admin/projects/${project.slug}`);
      return;
    }

    const error = await res.json().catch(() => ({ error: "创建失败" }));
    setMessage(error.error || "创建失败");
    setSaving(false);
  };

  return (
    <div>
      <h1 className="admin-heading">新建作品</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>标识 (slug)</label>
            <input value={draft.slug} onChange={(event) => updateField("slug", event.target.value)} required placeholder="my-project-slug" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>标题</label>
            <input value={draft.titleZh} onChange={(event) => { updateField("titleZh", event.target.value); if (!draft.slug) updateField("slug", "work-" + Date.now().toString(36)); }} required placeholder="我的项目" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>分类</label>
            <input value={draft.design} onChange={(event) => updateField("design", event.target.value)} placeholder="建筑摄影" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>城市</label>
            <input value={draft.city} onChange={(event) => updateField("city", event.target.value)} placeholder="上海" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>时间</label>
            <input value={draft.time} onChange={(event) => updateField("time", event.target.value)} placeholder="2024 / 已完成" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>设备器材</label>
            <input value={draft.equipment} onChange={(event) => updateField("equipment", event.target.value)} placeholder="Sony A7R5 + 24-70mm" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>排序 (数字越小越靠前)</label>
            <input value={draft.order} onChange={(event) => updateField("order", event.target.value)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group" style={{ alignSelf: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input checked={draft.visible} onChange={(event) => updateField("visible", event.target.checked)} type="checkbox" style={{ width: "auto" }} />
              发布可见
            </label>
          </div>
        </div>

        <h2 className="admin-subheading">封面图片</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <AdminImageField
              label="封面图"
              value={draft.coverUrl}
              onChange={(value) => updateField("coverUrl", value)}
              onSize={(width, height) => {
                updateField("coverW", String(width || 1440));
                updateField("coverH", String(height || 960));
              }}
              required
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="缩略图"
              value={draft.thumbUrl}
              onChange={(value) => updateField("thumbUrl", value)}
              onSize={(width, height) => {
                updateField("thumbW", String(width || 1200));
                updateField("thumbH", String(height || 800));
              }}
              required
            />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>封面宽度</label>
            <input value={draft.coverW} onChange={(event) => updateField("coverW", event.target.value)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>封面高度</label>
            <input value={draft.coverH} onChange={(event) => updateField("coverH", event.target.value)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>缩略图宽度</label>
            <input value={draft.thumbW} onChange={(event) => updateField("thumbW", event.target.value)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>缩略图高度</label>
            <input value={draft.thumbH} onChange={(event) => updateField("thumbH", event.target.value)} type="number" className="admin-input" />
          </div>
        </div>

        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? "创建中..." : "创建作品"}
        </button>
        {message && <p className="admin-message is-error">{message}</p>}
      </form>
    </div>
  );
}
