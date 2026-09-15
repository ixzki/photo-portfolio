import AdminLogin from "@/components/AdminLogin";
import AdminNavigation from "@/components/AdminNavigation";
import { isAuthenticated } from "@/lib/auth";
import { hasDatabase } from "@/lib/db";
import "./admin.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated();
  const databaseReady = hasDatabase();

  if (!authenticated) return <AdminLogin />;

  return (
    <div className="admin-container">
      <AdminNavigation />
      <div className="admin-main" id="admin-content">
        {!databaseReady && (
          <div className="admin-message is-error" style={{ display: "block", marginBottom: 16 }}>
            当前未配置在线数据库链接 DATABASE_URL。后台新增、排序、上传和保存需要先让开发者提供在线数据库链接。
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
