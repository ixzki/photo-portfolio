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
  featureUrl: "",
  coverUrl: "",
  thumbUrl: "",
  coverW: "1440",
  coverH: "960",
  thumbW: "1200",
  thumbH: "800",
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateDraft(draft: typeof initialDraft) {
  const errors: string[] = [];
  if (!draft.slug.trim()) errors.push("请填写 slug。");
  if (draft.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    errors.push("slug 只能使用小写字母、数字和连字符。");
  }
  if (!draft.titleZh.trim()) errors.push("请填写标题。");
  if (draft.featureUrl.trim() && !isHttpUrl(draft.featureUrl)) errors.push("请填写有效的首页精选图 URL。");
  if (!isHttpUrl(draft.coverUrl)) errors.push("请填写有效的封面图 URL。");
  if (!isHttpUrl(draft.thumbUrl)) errors.push("请填写有效的缩略图 URL。");
  return errors;
}

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
    setMessage("");

    const errors = validateDraft(draft);
    if (errors.length) {
      setMessage(errors[0]);
      return;
    }

    setSaving(true);
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
        <h2 className="admin-subheading">基本信息</h2>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>标识 slug</label>
            <input
              value={draft.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              required
              placeholder="my-project-slug"
              className="admin-input"
            />
          </div>
          <div className="admin-form-group">
            <label>标题</label>
            <input
              value={draft.titleZh}
              onChange={(event) => {
                updateField("titleZh", event.target.value);
                if (!draft.slug) updateField("slug", "work-" + Date.now().toString(36));
              }}
              required
              placeholder="我的项目"
              className="admin-input"
            />
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
            <label>排序</label>
            <input value={draft.order} onChange={(event) => updateField("order", event.target.value)} type="number" className="admin-input" />
          </div>
          <div className="admin-form-group" style={{ alignSelf: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input checked={draft.visible} onChange={(event) => updateField("visible", event.target.checked)} type="checkbox" style={{ width: "auto" }} />
              创建后公开发布
            </label>
          </div>
        </div>

        <h2 className="admin-subheading">展示图片</h2>
        <div className="admin-form-row admin-image-form-row">
          <div className="admin-form-group">
            <AdminImageField
              label="首页精选图"
              value={draft.featureUrl}
              onChange={(value) => updateField("featureUrl", value)}
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="详情首屏大图"
              value={draft.coverUrl}
              onChange={(value) => {
                const shouldSyncFeature = !draft.featureUrl || draft.featureUrl === draft.coverUrl;
                updateField("coverUrl", value);
                if (shouldSyncFeature) updateField("featureUrl", value);
              }}
              onSize={(width, height) => {
                updateField("coverW", String(width || 1440));
                updateField("coverH", String(height || 960));
              }}
              required
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="Works 缩略图"
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

        <button type="submit" className="admin-btn" disabled={saving}>
          {saving ? "创建中..." : "创建作品"}
        </button>
        {message && <p className="admin-message is-error">{message}</p>}
      </form>
    </div>
  );
}
