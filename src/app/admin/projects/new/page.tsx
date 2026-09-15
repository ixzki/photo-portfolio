"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminImageField from "@/components/AdminImageField";
import styles from "../../content-pages.module.css";

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
      <div className="admin-page-header">
        <h1 className="admin-heading">新建作品</h1>
        <Link href="/admin/projects" className="admin-btn-secondary">返回作品列表</Link>
      </div>
      <form onSubmit={handleSubmit} className="admin-form-stack">
        <section className="admin-panel" aria-labelledby="project-info-heading">
        <h2 className="admin-subheading" id="project-info-heading">基本信息</h2>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="new-project-title">作品标题 *</label>
            <input
              id="new-project-title"
              value={draft.titleZh}
              onChange={(event) => {
                updateField("titleZh", event.target.value);
                if (!draft.slug) updateField("slug", "work-" + Date.now().toString(36));
              }}
              required
              placeholder="作品名称"
              className="admin-input"
            />
          </div>
          <div className="admin-form-group">
            <label htmlFor="new-project-slug">页面地址 *</label>
            <input
              id="new-project-slug"
              value={draft.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              required
              placeholder="my-project-slug"
              className="admin-input"
              aria-describedby="new-project-slug-hint"
            />
            <p className="admin-field-hint" id="new-project-slug-hint">使用小写字母、数字和连字符，可保留自动生成的地址。</p>
          </div>
        </div>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="new-project-category">分类</label>
            <input id="new-project-category" value={draft.design} onChange={(event) => updateField("design", event.target.value)} placeholder="建筑摄影" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label htmlFor="new-project-city">城市</label>
            <input id="new-project-city" value={draft.city} onChange={(event) => updateField("city", event.target.value)} placeholder="上海" className="admin-input" />
          </div>
        </div>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="new-project-time">时间</label>
            <input id="new-project-time" value={draft.time} onChange={(event) => updateField("time", event.target.value)} placeholder="2024 / 已完成" className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label htmlFor="new-project-equipment">设备器材</label>
            <input id="new-project-equipment" value={draft.equipment} onChange={(event) => updateField("equipment", event.target.value)} placeholder="Sony A7R5 + 24-70mm" className="admin-input" />
          </div>
        </div>
        </section>

        <section className="admin-panel" aria-labelledby="project-images-heading">
        <h2 className="admin-subheading" id="project-images-heading">展示图片</h2>
        <div className={styles.imageFields}>
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
              label="作品列表缩略图"
              value={draft.thumbUrl}
              onChange={(value) => updateField("thumbUrl", value)}
              onSize={(width, height) => {
                updateField("thumbW", String(width || 1200));
                updateField("thumbH", String(height || 800));
              }}
              required
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="首页精选图（可选）"
              value={draft.featureUrl}
              onChange={(value) => updateField("featureUrl", value)}
            />
          </div>
        </div>
        </section>

        <section className="admin-panel" aria-labelledby="project-publish-heading">
          <h2 className="admin-subheading" id="project-publish-heading">发布设置</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label htmlFor="new-project-order">展示排序</label>
              <input id="new-project-order" value={draft.order} onChange={(event) => updateField("order", event.target.value)} type="number" className="admin-input" />
            </div>
            <div className="admin-form-group">
              <label>可见性</label>
              <label className={styles.visibility}>
                <input checked={draft.visible} onChange={(event) => updateField("visible", event.target.checked)} type="checkbox" />
                创建后公开发布
              </label>
            </div>
          </div>
        </section>
        <div className="admin-save-bar">
          <span role="status" className={`admin-message${message ? " is-error" : ""}`}>{message || "创建后可继续添加照片和调整排版"}</span>
          <button type="submit" className="admin-btn" disabled={saving}>
            {saving ? "创建中..." : "创建作品"}
          </button>
        </div>
      </form>
    </div>
  );
}
