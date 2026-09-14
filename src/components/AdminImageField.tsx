"use client";

import { useEffect, useId, useRef, useState } from "react";
import AdminPreviewImage from "@/components/AdminPreviewImage";
import { isCompleteHttpUrl } from "@/lib/admin-image-utils.mjs";
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
  const inputId = useId();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [message, setMessage] = useState("");
  const [detectedSize, setDetectedSize] = useState({ width: 0, height: 0 });
  const sizeTimerRef = useRef<number | null>(null);
  const sizeRequestRef = useRef(0);
  const latestValue = useRef(value);

  useEffect(() => { latestValue.current = value; sizeRequestRef.current += 1; }, [value]);

  useEffect(() => {
    return () => {
      if (sizeTimerRef.current) window.clearTimeout(sizeTimerRef.current);
      sizeRequestRef.current += 1;
    };
  }, []);

  const loadMedia = async () => {
    setLoadingLibrary(true);
    setMessage("");
    try {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error();
      const items = await res.json();
      if (!Array.isArray(items)) throw new Error();
      setMedia(items);
    } catch { setMessage("媒体库加载失败，请再次点击媒体库重试。"); }
    finally { setLoadingLibrary(false); }
  };

  const detectSize = async (nextValue: string) => {
    if (nextValue !== latestValue.current) return;
    const requestId = ++sizeRequestRef.current;
    if (!isCompleteHttpUrl(nextValue)) {
      setDetectedSize({ width: 0, height: 0 });
      return;
    }

    const size = await readImageSize(nextValue.trim());
    if (requestId !== sizeRequestRef.current) return;
    setDetectedSize(size);
    if (size.width && size.height) onSize?.(size.width, size.height);
  };

  const scheduleSizeDetection = (nextValue: string) => {
    if (sizeTimerRef.current) window.clearTimeout(sizeTimerRef.current);

    if (!isCompleteHttpUrl(nextValue)) {
      sizeRequestRef.current += 1;
      setDetectedSize({ width: 0, height: 0 });
      return;
    }

    sizeTimerRef.current = window.setTimeout(() => {
      void detectSize(nextValue);
    }, 500);
  };

  const updateValue = (nextValue: string) => {
    latestValue.current = nextValue;
    onChange(nextValue);
    setMessage("");
    setDetectedSize({ width: 0, height: 0 });
    scheduleSizeDetection(nextValue);
  };

  const handleBlur = (nextValue: string) => {
    if (sizeTimerRef.current) window.clearTimeout(sizeTimerRef.current);
    void detectSize(nextValue);
  };

  const selectMedia = (item: MediaItem) => {
    latestValue.current = item.url;
    sizeRequestRef.current += 1;
    onChange(item.url);
    onSize?.(item.width, item.height);
    onAlt?.(item.alt || item.title || "");
    setDetectedSize({ width: item.width, height: item.height });
    setShowLibrary(false);
  };

  const saveCurrentToLibrary = async () => {
    if (!isCompleteHttpUrl(value)) return;
    setSavingMedia(true);
    setMessage("");
    try {
      const size = detectedSize.width && detectedSize.height
        ? detectedSize
        : await readImageSize(value);
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

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "保存失败" }));
        setMessage(error.error || "保存失败");
        return;
      }

      if (showLibrary) await loadMedia();
      setMessage("已保存到媒体库");
    } catch { setMessage("存入媒体库失败，请检查网络后重试。"); }
    finally { setSavingMedia(false); }
  };

  const toggleLibrary = async () => {
    const nextOpen = !showLibrary;
    setShowLibrary(nextOpen);
    if (nextOpen && media.length === 0) await loadMedia();
  };

  return (
    <div className="admin-image-field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className="admin-image-input-row">
        <input
          id={inputId}
          aria-label={label || "图片链接"}
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          onBlur={(event) => handleBlur(event.target.value)}
          className="admin-input"
          placeholder={placeholder}
          required={required}
        />
        <button type="button" className="admin-btn-sm" onClick={() => void toggleLibrary()}>
          媒体库
        </button>
        <button type="button" className="admin-btn-sm" disabled={!isCompleteHttpUrl(value) || savingMedia} onClick={saveCurrentToLibrary}>
          {savingMedia ? "保存中..." : "存入库"}
        </button>
      </div>
      {message && <p className={`admin-field-message${message.includes("失败") ? " is-error" : ""}`}>{message}</p>}
      {isCompleteHttpUrl(value) && (
        <div className="admin-image-preview">
          <AdminPreviewImage src={value} alt="" width={160} height={106} sizes="160px" />
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
                  <AdminPreviewImage src={item.url} alt={item.alt || item.title || ""} width={220} height={165} sizes="220px" />
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
