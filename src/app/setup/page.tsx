import Link from "next/link";

export default function SetupPage() {
  return (
    <section style={{
      maxWidth: 760, margin: "64px auto", padding: "0 24px 48px",
      fontFamily: '"Jost", "Source Han Sans SC", "Noto Sans SC", "Helvetica Neue", Helvetica, Arial, sans-serif',
      color: "#1a1a1a", lineHeight: 1.8, fontSize: 15,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>网站配置说明</h1>
      <p style={{ color: "#4a5568" }}>
        本网站使用 Vercel 部署、Neon Postgres 保存内容，照片通过又拍云图片地址加载。
        此页面提供配置说明，不会创建数据表或修改数据库。
      </p>

      <section style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>本地预览</h2>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>使用 Node.js 24，在项目根目录配置 <code>.env.local</code>；首次配置可参考 <code>.env.example</code>。</li>
          <li>把 <code>DATABASE_URL</code> 设为从现有生产分支复制的 Neon 开发分支连接串，并设置独立的 <code>ADMIN_PASSWORD</code>。</li>
          <li>执行 <code>npm run check:env</code> 检查数据库，再执行 <code>npm run preview</code>。</li>
          <li>在本机访问 <code>http://127.0.0.1:3100</code>，后台入口为 <code>/admin</code>。</li>
        </ol>
        <p style={{ marginBottom: 0 }}>
          需要编辑开发数据时设置 <code>PREVIEW_READ_ONLY=false</code>。
          开发分支的编辑不会自动同步到生产；缺少数据表时应检查连接的分支。
        </p>
      </section>

      <section style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Vercel 部署</h2>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li>在项目 Settings → Environment Variables 中按环境配置 <code>DATABASE_URL</code> 和 <code>ADMIN_PASSWORD</code>。</li>
          <li>Production 保持生产数据库；Preview 使用独立测试分支，避免测试编辑影响线上内容。</li>
          <li>使用 Node.js 24 和 <code>npm run build</code>，修改环境变量后重新部署。</li>
        </ol>
        <p style={{ marginBottom: 0 }}>部署不会自动合并开发分支数据，也不会自动初始化空数据库。</p>
      </section>

      <section style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>又拍云图片</h2>
        <p style={{ margin: 0 }}>
          后台保存图片 URL，不负责上传图床文件。新图片域名填入 <code>NEXT_PUBLIC_UPYUN_HOSTS</code>，
          多个纯域名用逗号分隔；其他图床域名可填入 <code>IMAGE_REMOTE_HOSTS</code>。
          使用签名链接或不支持图片处理时，可设置 <code>NEXT_PUBLIC_UPYUN_TRANSFORMS=false</code> 并验证图片。
          变更后本地重启、线上重新构建部署。
        </p>
        <p style={{ marginBottom: 0 }}>图片访问失败时，检查原始链接以及又拍云防盗链、签名规则是否允许当前预览来源。</p>
      </section>

      <p style={{ marginTop: 24, color: "#4a5568", overflowWrap: "anywhere" }}>
        完整操作见项目内的《本地预览与 Vercel 部署》（docs/deployment.md）。连接串和密码仅保存在本机环境文件或部署平台设置中。
      </p>
      <Link href="/" style={{ color: "#2b6cb0" }}>返回首页</Link>
    </section>
  );
}
