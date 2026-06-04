"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/types";

interface AdminImageFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSize?: (width: number, height: number) => void;
  onAlt?: (alt: string) => void;
  placeholder?: string;
  required?: boolean;
}

function readImageSize(url: string): Promise<{ width: number; height: number }> {
  if (!url) return Promise.resolve({ width: 0, height: 0 });
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}

export default function AdminImageField({
  label,
  value,
  onChange,
  onSize,
  onAlt,
  placeholder = "https://...",
  required,
}: AdminImageFieldProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [message, setMessage] = useState("");
  const [detectedSize, setDetectedSize] = useState({ width: 0, height: 0 });

  const loadMedia = async () => {
    setLoadingLibrary(true);
    const res = await fetch("/api/media");
    if (res.ok) setMedia(await res.json());
    setLoadingLibrary(false);
  };

  const updateValue = async (nextValue: string) => {
    onChange(nextValue);
    setMessage("");
    const size = await readImageSize(nextValue);
    setDetectedSize(size);
    if (size.width && size.height) onSize?.(size.width, size.height);
  };

  const selectMedia = (item: MediaItem) => {
    onChange(item.url);
    onSize?.(item.width, item.height);
    onAlt?.(item.alt || item.title || "");
    setDetectedSize({ width: item.width, height: item.height });
    setShowLibrary(false);
  };

  const saveCurrentToLibrary = async () => {
    if (!value) return;
    setSavingMedia(true);
    setMessage("");
    const size = detectedSize.width && detectedSize.height ? detectedSize : await readImageSize(value);
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: value,
        title: label || "",
        alt: label || "",
        width: size.width || 1440,
        height: size.height || 960,
      }),
    });
    setSavingMedia(false);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "保存失败" }));
      setMessage(error.error || "保存失败");
      return;
    }

    setMessage("已保存到媒体库");
    if (showLibrary) await loadMedia();
  };

  const toggleLibrary = async () => {
    const nextOpen = !showLibrary;
    setShowLibrary(nextOpen);
    if (nextOpen && media.length === 0) await loadMedia();
  };

  return (
    <div className="admin-image-field">
      {label && <label>{label}</label>}
      <div className="admin-image-input-row">
        <input
          value={value}
          onChange={(event) => void updateValue(event.target.value)}
          className="admin-input"
          placeholder={placeholder}
          required={required}
        />
        <button type="button" className="admin-btn-sm" onClick={() => void toggleLibrary()}>
          媒体库
        </button>
        <button type="button" className="admin-btn-sm" disabled={!value || savingMedia} onClick={saveCurrentToLibrary}>
          {savingMedia ? "保存中..." : "存入库"}
        </button>
      </div>
      {message && <p className={`admin-field-message${message.includes("失败") ? " is-error" : ""}`}>{message}</p>}
      {value && (
        <div className="admin-image-preview">
          <img className="loaded" src={value} alt="" />
          {detectedSize.width > 0 && (
            <span className="admin-image-size">{detectedSize.width} x {detectedSize.height}</span>
          )}
        </div>
      )}
      {showLibrary && (
        <div className="admin-media-picker">
          {loadingLibrary ? (
            <p className="admin-muted">加载媒体库...</p>
          ) : media.length === 0 ? (
            <p className="admin-muted">媒体库还是空的。粘贴图片 URL 后可以先存入库。</p>
          ) : (
            <div className="admin-media-picker-grid">
              {media.map((item) => (
                <button type="button" key={item.id} className="admin-media-picker-item" onClick={() => selectMedia(item)}>
                  <img className="loaded" src={item.url} alt={item.alt || item.title || ""} />
                  <span>{item.title || item.alt || "未命名图片"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
