import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { isAuthenticated } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated();
  const databaseReady = hasDatabase();

  if (!authenticated) return <AdminLogin />;

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h2 className="admin-logo"><Link href="/admin">后台管理</Link></h2>
        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-item">总览</Link>
          <Link href="/admin/features" className="admin-nav-item">首页精选</Link>
          <Link href="/admin/projects" className="admin-nav-item">作品管理</Link>
          <Link href="/admin/media" className="admin-nav-item">媒体库</Link>
          <Link href="/admin/settings" className="admin-nav-item">站点设置</Link>
          <AdminLogoutButton />
        </nav>
      </aside>
      <main className="admin-main">
        {!databaseReady && (
          <div className="admin-message is-error" style={{ display: "block", marginBottom: 16 }}>
            当前未配置在线数据库链接 DATABASE_URL。后台新增、排序、上传和保存需要先让开发者提供在线数据库链接。
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
