"use client";

import { useState, useEffect } from "react";
import AdminImageField from "@/components/AdminImageField";
import type { ContactItem } from "@/lib/types";

interface Settings {
  siteName: string;
  aboutText: string;
  email: string;
  location: string;
  contacts: ContactItem[];
  avatarUrl: string;
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

  return { ...data, contacts };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => setSettings(normalizeSettings(data)));
  }, []);

  if (!settings) return <p>加载中...</p>;

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
    setSaving(false);
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-heading" style={{ margin: 0 }}>站点设置</h1>
        <div className="admin-actions">
          <button onClick={handleSave} disabled={saving} className="admin-btn">
            {saving ? "保存中..." : "保存"}
          </button>
          {message && <span className={`admin-message${message.includes("失败") ? " is-error" : ""}`}>{message}</span>}
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-form">
        <div className="admin-form-group">
          <label>网站名称</label>
          <input value={settings.siteName} onChange={(e) => updateField("siteName", e.target.value)} className="admin-input" />
        </div>
        <div className="admin-form-group">
          <label>简介</label>
          <textarea
            value={settings.aboutText}
            onChange={(e) => updateField("aboutText", e.target.value)}
            rows={5}
            className="admin-textarea"
            placeholder="介绍你的摄影方向、可合作的项目类型..."
          />
        </div>
        <div className="admin-form-group">
          <div className="admin-section-title-row" style={{ marginTop: 0, marginBottom: 8 }}>
            <label style={{ margin: 0 }}>联系方式</label>
            <button type="button" onClick={addContact} className="admin-btn-sm">添加一项</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {settings.contacts.map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 8, alignItems: "center" }}>
                <input
                  value={item.label}
                  onChange={(e) => updateContact(item.id, "label", e.target.value)}
                  className="admin-input"
                  placeholder="email"
                />
                <input
                  value={item.value}
                  onChange={(e) => updateContact(item.id, "value", e.target.value)}
                  className="admin-input"
                  placeholder="hello@example.com"
                />
                <button type="button" onClick={() => removeContact(item.id)} className="admin-btn-sm">删除</button>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label>版权信息（显示在页脚）</label>
            <input value={settings.copyright} onChange={(e) => updateField("copyright", e.target.value)} className="admin-input" placeholder="林屿摄影档案。保留所有权利。" />
          </div>
          <div className="admin-form-group">
            <label>备案号（可选，留空则不显示）</label>
            <input value={settings.icp} onChange={(e) => updateField("icp", e.target.value)} className="admin-input" placeholder="粤ICP备XXXXXXXX号" />
          </div>
        </div>
        <div className="admin-form-group">
          <AdminImageField
            label="头像"
            value={settings.avatarUrl}
            onChange={(value) => updateField("avatarUrl", value)}
          />
        </div>
      </form>
    </div>
  );
}
