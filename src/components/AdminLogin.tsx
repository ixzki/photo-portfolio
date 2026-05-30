"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });

    setLoading(false);
    if (res.ok) {
      window.location.reload();
      return;
    }

    setMessage("密码错误");
  };

  return (
    <div className="admin-login">
      <form onSubmit={handleSubmit} className="admin-login-panel">
        <h1 className="admin-heading">后台登录</h1>
        <div className="admin-form-group">
          <label>管理密码</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="admin-input"
            type="password"
            autoComplete="current-password"
            autoFocus
          />
        </div>
        <button className="admin-btn" disabled={loading || !password}>
          {loading ? "登录中..." : "登录"}
        </button>
        {message && <p className="admin-message is-error">{message}</p>}
      </form>
    </div>
  );
}
