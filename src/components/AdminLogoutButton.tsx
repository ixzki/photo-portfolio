"use client";

export default function AdminLogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.reload();
  };

  return (
    <button type="button" onClick={handleLogout} className="admin-nav-item admin-nav-button">
      退出登录
    </button>
  );
}
