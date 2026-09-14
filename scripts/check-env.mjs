import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { databaseUrl, isDemoPreview, isReadOnlyPreview } from "../src/lib/preview-config.mjs";
import { getUpyunHosts, upyunTransformsEnabled } from "../src/lib/image-hosts.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const url = databaseUrl();
console.log(`运行模式：${isDemoPreview() ? "本地示例（非线上数据）" : "Neon 数据库"}`);
console.log(`写入权限：${isReadOnlyPreview() ? "只读" : "可编辑"}`);
console.log(`管理员密码：${process.env.ADMIN_PASSWORD ? "已配置（隐藏）" : "未配置；生产构建/登录前必须设置"}`);
console.log(`又拍云域名：${getUpyunHosts().join(", ")}`);
console.log(`又拍云图片处理：${upyunTransformsEnabled() ? "开启" : "关闭"}`);

if (!url) {
  console.log(isDemoPreview() ? "Neon 尚未连接；请在 .env.local 填入开发分支 DATABASE_URL。" : "缺少 DATABASE_URL。请先配置 Neon。 ");
  if (!isDemoPreview()) process.exitCode = 1;
} else {
  try {
    const parsed = new URL(url);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("INVALID_URL");
    const sql = neon(url);
    const rows = await sql("SELECT to_regclass('public.portfolio_settings')::text AS settings, to_regclass('public.portfolio_projects')::text AS projects, to_regclass('public.portfolio_features')::text AS features, to_regclass('public.portfolio_media')::text AS media");
    const missing = Object.entries(rows[0]).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) {
      console.log(`连接成功，但缺少数据表：${missing.join(", ")}。请从现有生产分支创建开发分支。`);
      process.exitCode = 1;
    } else {
      const counts = await sql("SELECT (SELECT count(*)::int FROM portfolio_settings) AS settings, (SELECT count(*)::int FROM portfolio_projects) AS projects, (SELECT count(*)::int FROM portfolio_features) AS features, (SELECT count(*)::int FROM portfolio_media) AS media");
      console.log(`Neon 只读检查成功：${JSON.stringify(counts[0])}`);
      if (!counts[0].settings) {console.log("缺少站点设置记录。"); process.exitCode = 1;}
    }
  } catch (error) {
    // Do not emit driver messages/stacks; these may contain connection credentials.
    console.error(`Neon 检查失败（${error?.code || "连接或配置错误"}）。请检查开发分支连接串、网络和分支状态。`);
    process.exitCode = 1;
  }
}
