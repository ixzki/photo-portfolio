import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { isAuthenticated } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated();

  if (!authenticated) return <AdminLogin />;

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h2 className="admin-logo"><Link href="/admin">后台管理</Link></h2>
        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-item">总览</Link>
          <Link href="/admin/features" className="admin-nav-item">首页精选</Link>
          <Link href="/admin/projects" className="admin-nav-item">作品管理</Link>
          <Link href="/admin/settings" className="admin-nav-item">站点设置</Link>
          <AdminLogoutButton />
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}