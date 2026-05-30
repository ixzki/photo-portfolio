import { hasDatabase, checkConnection } from "@/lib/db";

export default async function SetupPage() {
  const connected = hasDatabase() && await checkConnection();

  return (
    <div style={{
      maxWidth: 680, margin: "80px auto", padding: "0 24px",
      fontFamily: '"Source Han Sans SC", "Noto Sans SC", "Helvetica Neue", Helvetica, Arial, sans-serif',
      color: "#1a1a1a", lineHeight: 1.8, fontSize: 15
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        {connected ? "✅ 数据库已连接" : "⚙️ 初次部署 — 配置数据库"}
      </h1>

      {connected ? (
        <div style={{ background: "#f0fff4", border: "1px solid #c6f6d5", borderRadius: 8, padding: 20, marginTop: 24 }}>
          <p style={{ margin: 0 }}>数据库连接正常，网站已就绪。</p>
          <p style={{ margin: "8px 0 0" }}>
            <a href="/" style={{ color: "#2b6cb0" }}>← 返回首页</a>
            {" "}|{" "}
            <a href="/admin" style={{ color: "#2b6cb0" }}>进入后台 →</a>
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 17, color: "#4a5568", marginTop: 12 }}>
            本网站需要{" "}
            <a href="https://neon.tech" target="_blank" style={{ color: "#2b6cb0", fontWeight: 500 }}>Neon Postgres</a>
            {" "}数据库来存储数据。
          </p>

          <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>第一步：创建 Neon 数据库</h2>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>访问{" "}<a href="https://neon.tech" target="_blank" style={{ color: "#2b6cb0" }}>neon.tech</a>{" "}并注册（免费额度足够使用）</li>
              <li>创建一个新项目和新数据库</li>
              <li>在 Dashboard 中找到连接字符串，格式类似：</li>
            </ol>
            <pre style={{
              background: "#edf2f7", padding: "12px 16px", borderRadius: 6,
              fontSize: 13, overflow: "auto", marginTop: 12
            }}>
              postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
            </pre>
          </div>

          <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginTop: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>第二步：设置 Vercel 环境变量</h2>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>在 Vercel 项目 Dashboard → Settings → Environment Variables</li>
              <li>添加以下三个环境变量：</li>
            </ol>
            <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#edf2f7" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e8f0" }}>变量名</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e8f0" }}>值</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace" }}>DATABASE_URL</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 12, color: "#718096" }}>上面复制的 Neon 连接字符串</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace" }}>ADMIN_PASSWORD</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 12, color: "#718096" }}>你选择的管理员密码</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace" }}>AUTH_SECRET</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: 12, color: "#718096" }}>随机密钥（32 位以上）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: "#fffaf0", border: "1px solid #fbd38d", borderRadius: 8, padding: 20, marginTop: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>第三步：重新部署</h2>
            <p style={{ margin: 0 }}>
              在 Vercel 中点击 <strong>Redeploy</strong>（重新部署），环境变量生效后自动创建数据表并填充示例内容。
            </p>
          </div>
        </>
      )}
    </div>
  );
}