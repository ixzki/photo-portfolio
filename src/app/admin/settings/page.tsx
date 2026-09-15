"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminImageField from "@/components/AdminImageField";
import type { ContactItem } from "@/lib/types";
import styles from "../content-pages.module.css";

interface Settings {
  siteName: string;
  aboutText: string;
  email: string;
  location: string;
  contacts: ContactItem[];
  avatarUrl: string;
  faviconUrl: string;
  copyright: string;
  icp: string;
}

function normalizeSettings(data: Settings): Settings {
  const contacts = Array.isArray(data.contacts) && data.contacts.length > 0
    ? data.contacts
    : [
        { id: "email", label: "email", value: data.email || "" },
        { id: "location", label: "base", value: data.location || "" },
      ].filter((item) => item.value);

  return { ...data, faviconUrl: data.faviconUrl || "/favicon.ico", contacts };
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => setSettings(normalizeSettings(data)));
  }, []);

  if (!settings) return <p className="admin-empty" role="status">加载站点设置...</p>;

  const updateField = (field: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateContact = (id: string, field: "label" | "value", value: string) => {
    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        contacts: prev.contacts.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
      };
    });
  };

  const addContact = () => {
    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        contacts: [
          ...prev.contacts,
          { id: `contact-${Date.now()}`, label: "title", value: "" },
        ],
      };
    });
  };

  const removeContact = (id: string) => {
    setSettings((prev) => {
      if (!prev) return null;
      return { ...prev, contacts: prev.contacts.filter((item) => item.id !== id) };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMessage(res.ok ? "保存成功" : "保存失败");
    if (res.ok) router.refresh();
    setSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-heading">站点设置</h1>
      </div>

      <form onSubmit={handleSave} className="admin-form-stack">
        <section className="admin-panel" aria-labelledby="settings-site-heading">
        <h2 className="admin-subheading" id="settings-site-heading">网站信息</h2>
        <div className="admin-form-group">
          <label htmlFor="settings-site-name">网站名称</label>
          <input id="settings-site-name" value={settings.siteName} onChange={(e) => updateField("siteName", e.target.value)} className="admin-input" />
        </div>
        <div className="admin-form-group">
          <label htmlFor="settings-about">简介</label>
          <textarea
            id="settings-about"
            value={settings.aboutText}
            onChange={(e) => updateField("aboutText", e.target.value)}
            rows={5}
            className="admin-textarea"
            placeholder="介绍你的摄影方向、可合作的项目类型..."
          />
        </div>
        </section>
        <section className="admin-panel" aria-labelledby="settings-contacts-heading">
          <div className="admin-section-header">
            <h2 className="admin-subheading" id="settings-contacts-heading">联系方式</h2>
            <button type="button" onClick={addContact} className="admin-btn-secondary admin-btn-sm">添加联系方式</button>
          </div>
          <div className={styles.contactList}>
            {settings.contacts.map((item, index) => (
              <div key={item.id} className={styles.contactRow}>
                <div className="admin-form-group">
                <label htmlFor={`contact-label-${item.id}`}>名称</label>
                <input
                  id={`contact-label-${item.id}`}
                  value={item.label}
                  onChange={(e) => updateContact(item.id, "label", e.target.value)}
                  className="admin-input"
                  placeholder="email"
                />
                </div>
                <div className="admin-form-group">
                <label htmlFor={`contact-value-${item.id}`}>内容</label>
                <input
                  id={`contact-value-${item.id}`}
                  value={item.value}
                  onChange={(e) => updateContact(item.id, "value", e.target.value)}
                  className="admin-input"
                  placeholder="hello@example.com"
                />
                </div>
                <button type="button" onClick={() => removeContact(item.id)} className="admin-btn-sm admin-btn-danger" aria-label={`删除第 ${index + 1} 项联系方式`}>删除</button>
              </div>
            ))}
          </div>
          {settings.contacts.length === 0 && <p className="admin-empty">暂无联系方式。</p>}
        </section>
        <section className="admin-panel" aria-labelledby="settings-images-heading">
          <h2 className="admin-subheading" id="settings-images-heading">网站图片</h2>
          <div className={styles.imageFields}>
          <div className="admin-form-group">
            <AdminImageField
              label="头像"
              value={settings.avatarUrl}
              onChange={(value) => updateField("avatarUrl", value)}
            />
          </div>
          <div className="admin-form-group">
            <AdminImageField
              label="网站图标（favicon）"
              value={settings.faviconUrl}
              onChange={(value) => updateField("faviconUrl", value)}
              placeholder="/favicon.ico 或 https://..."
            />
          </div>
          </div>
        </section>
        <section className="admin-panel" aria-labelledby="settings-footer-heading">
          <h2 className="admin-subheading" id="settings-footer-heading">页脚信息</h2>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label htmlFor="settings-copyright">版权信息</label>
              <input id="settings-copyright" value={settings.copyright} onChange={(e) => updateField("copyright", e.target.value)} className="admin-input" placeholder="林屿摄影档案。保留所有权利。" />
            </div>
            <div className="admin-form-group">
              <label htmlFor="settings-icp">备案号（可选）</label>
              <input id="settings-icp" value={settings.icp} onChange={(e) => updateField("icp", e.target.value)} className="admin-input" placeholder="粤ICP备XXXXXXXX号" />
            </div>
          </div>
        </section>
        <div className="admin-save-bar">
          <span role="status" aria-live="polite" className={`admin-message${message.includes("失败") ? " is-error" : ""}`}>{message || "修改后保存，即可更新网站"}</span>
          <button type="submit" disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </form>
    </div>
  );
}
