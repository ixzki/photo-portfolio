"use client";

import { useEffect, useState } from "react";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import type { MediaItem } from "@/lib/types";
import styles from "../content-pages.module.css";

const emptyDraft = {
  url: "",
  title: "",
  alt: "",
  width: 1440,
  height: 960,
};

function readImageSize(url: string): Promise<{ width: number; height: number }> {
  if (!url) return Promise.resolve({ width: 0, height: 0 });
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");

  const loadItems = async () => {
    const res = await fetch("/api/media");
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    let active = true;
    fetch("/api/media").then((res) => res.json()).then((data) => {
      if (active && Array.isArray(data)) setItems(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateDraftUrl = async (url: string) => {
    setDraft((current) => ({ ...current, url }));
    const size = await readImageSize(url);
    if (size.width && size.height) {
      setDraft((current) => ({ ...current, width: size.width, height: size.height }));
    }
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "保存失败" }));
      setMessage(error.error || "保存失败");
      return;
    }

    setDraft(emptyDraft);
    setShowAdd(false);
    setMessage("已加入媒体库");
    await loadItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("确定删除这张媒体库图片？已用于作品的图片不会被自动移除。")) return;
    const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
    if (res.ok) await loadItems();
  };

  const updateItem = async (item: MediaItem, data: Partial<MediaItem>) => {
    const next = { ...item, ...data };
    const res = await fetch(`/api/media?id=${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-heading">媒体库</h1>
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="admin-btn" aria-expanded={showAdd} aria-controls="add-media-panel">
          {showAdd ? "收起添加" : "添加图片"}
        </button>
      </div>
      {message && <p role="status" className={`admin-message${message.includes("失败") ? " is-error" : ""}`}>{message}</p>}

      {showAdd && <form onSubmit={addItem} className={`admin-panel ${styles.mediaAdd}`} id="add-media-panel" aria-labelledby="add-media-heading">
        <h2 className="admin-subheading" id="add-media-heading">添加图片</h2>
        <div className="admin-form-group">
          <label htmlFor="media-url">图片 URL</label>
          <input
            id="media-url"
            value={draft.url}
            onChange={(event) => void updateDraftUrl(event.target.value)}
            required
            className="admin-input"
            placeholder="https://..."
          />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="media-title">标题</label>
            <input id="media-title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label htmlFor="media-alt">图片描述（alt）</label>
            <input id="media-alt" value={draft.alt} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="media-width">宽度（px）</label>
            <input id="media-width" type="number" value={draft.width} onChange={(event) => setDraft((current) => ({ ...current, width: Number(event.target.value) || 1440 }))} className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label htmlFor="media-height">高度（px）</label>
            <input id="media-height" type="number" value={draft.height} onChange={(event) => setDraft((current) => ({ ...current, height: Number(event.target.value) || 960 }))} className="admin-input" />
          </div>
        </div>
        <div className="admin-toolbar">
          <button type="submit" className="admin-btn" disabled={saving}>{saving ? "保存中..." : "加入媒体库"}</button>
          <button type="button" className="admin-btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>取消</button>
        </div>
      </form>}

      <section aria-labelledby="media-library-heading">
      <div className={`admin-section-header ${styles.mediaHeader}`}>
        <h2 className="admin-subheading" id="media-library-heading">全部图片 <span className="admin-field-hint">{items.length}</span></h2>
        <input type="search" aria-label="搜索媒体库" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题或图片描述" className={`admin-input ${styles.mediaSearch}`} />
      </div>
      <div className="admin-media-grid">
        {items.filter((item) => `${item.title} ${item.alt || ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((item) => (
          <div key={item.id} className="admin-media-card">
            <AdminPreviewImage src={item.url} alt={item.alt || item.title} width={320} height={240} sizes="(max-width: 700px) 100vw, 320px" />
            <h3 className={styles.mediaTitle}>{item.title || "未命名图片"}</h3>
            <details className={styles.mediaEdit}>
              <summary>编辑信息</summary>
              <div className="admin-form-group">
                <label htmlFor={`media-title-${item.id}`}>标题</label>
                <input
                  id={`media-title-${item.id}`}
                  className="admin-input"
                  defaultValue={item.title}
                  placeholder="标题"
                  onBlur={(event) => updateItem(item, { title: event.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor={`media-alt-${item.id}`}>图片描述（alt）</label>
                <input
                  id={`media-alt-${item.id}`}
                  className="admin-input"
                  defaultValue={item.alt || ""}
                  placeholder="图片内容描述"
                  onBlur={(event) => updateItem(item, { alt: event.target.value || null })}
                />
              </div>
              <p className="admin-field-hint">离开输入框时自动保存。</p>
            </details>
            <div className={styles.mediaActions}>
              <span className="admin-media-meta">{item.width} × {item.height}</span>
              <button type="button" className="admin-btn-sm admin-btn-danger" aria-label={`从媒体库删除 ${item.title || "未命名图片"}`} onClick={() => deleteItem(item.id)}>删除图片</button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="admin-empty">媒体库暂无图片，点击“添加图片”录入图片 URL。</p>}
      {items.length > 0 && !items.some((item) => `${item.title} ${item.alt || ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && <p className="admin-empty">没有找到匹配的图片。</p>}
      </section>
    </div>
  );
}
