"use client";

import { useEffect, useState } from "react";
import type { MediaItem } from "@/lib/types";

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
        <h1 className="admin-heading" style={{ margin: 0 }}>媒体库</h1>
        {message && <span className={`admin-message${message.includes("失败") ? " is-error" : ""}`}>{message}</span>}
      </div>

      <form onSubmit={addItem} className="admin-form admin-media-form">
        <div className="admin-form-group">
          <label>图片 URL</label>
          <input
            value={draft.url}
            onChange={(event) => void updateDraftUrl(event.target.value)}
            required
            className="admin-input"
            placeholder="https://..."
          />
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>标题</label>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>描述 / alt</label>
            <input value={draft.alt} onChange={(event) => setDraft((current) => ({ ...current, alt: event.target.value }))} className="admin-input" />
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>宽度</label>
            <input type="number" value={draft.width} onChange={(event) => setDraft((current) => ({ ...current, width: Number(event.target.value) || 1440 }))} className="admin-input" />
          </div>
          <div className="admin-form-group">
            <label>高度</label>
            <input type="number" value={draft.height} onChange={(event) => setDraft((current) => ({ ...current, height: Number(event.target.value) || 960 }))} className="admin-input" />
          </div>
        </div>
        <button type="submit" className="admin-btn" disabled={saving}>{saving ? "保存中..." : "加入媒体库"}</button>
      </form>

      <div className="admin-media-grid">
        {items.map((item) => (
          <div key={item.id} className="admin-media-card">
            <img className="loaded" src={item.url} alt={item.alt || item.title} />
            <input
              className="admin-input"
              defaultValue={item.title}
              placeholder="标题"
              onBlur={(event) => updateItem(item, { title: event.target.value })}
            />
            <input
              className="admin-input"
              defaultValue={item.alt || ""}
              placeholder="描述 / alt"
              onBlur={(event) => updateItem(item, { alt: event.target.value || null })}
            />
            <div className="admin-media-meta">{item.width} x {item.height}</div>
            <button type="button" className="admin-btn-sm admin-btn-danger" onClick={() => deleteItem(item.id)}>删除</button>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="admin-muted">媒体库还是空的。先添加一张图片 URL。</p>}
    </div>
  );
}
