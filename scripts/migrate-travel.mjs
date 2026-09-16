import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { databaseUrl, isReadOnlyPreview } from "../src/lib/preview-config.mjs";
import { initialTravel } from "../src/lib/travel-seed.mjs";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

async function migrate() {
  const seedExamples = process.argv.includes("--seed-example");
  if (process.argv.slice(2).some((arg) => arg !== "--seed-example")) throw new Error("INVALID_ARGUMENT");
  if (isReadOnlyPreview()) throw new Error("READ_ONLY_PREVIEW");
  if (!databaseUrl()) throw new Error("DATABASE_NOT_CONFIGURED");
  const sql = neon(databaseUrl());
  const seed = initialTravel();
  seed.updatedAt = new Date().toISOString();
  await sql.transaction([
    sql(`CREATE TABLE IF NOT EXISTS portfolio_travel (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, visible BOOLEAN NOT NULL DEFAULT false,
      revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), data JSONB NOT NULL
    )`),
    sql(`CREATE TABLE IF NOT EXISTS portfolio_travel_migrations (
      id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`),
    sql(`WITH migration AS (
      INSERT INTO portfolio_travel_migrations (id)
      SELECT 'seed-example-journey-v1' WHERE $5::boolean
      ON CONFLICT DO NOTHING RETURNING id
    ) INSERT INTO portfolio_travel (id, slug, visible, revision, updated_at, data)
      SELECT $1, $2, true, 1, $3::timestamptz, $4::jsonb FROM migration ON CONFLICT DO NOTHING`,
    [seed.id, seed.slug, seed.updatedAt, JSON.stringify(seed), seedExamples]),
  ]);
  const rows = await sql("SELECT count(*)::int AS journeys FROM portfolio_travel");
  console.log(`旅行表迁移完成，当前 ${rows[0].journeys} 条旅行。${seedExamples ? "已请求一次性示例；重复运行不覆盖编辑或恢复已删除的示例。" : "未写入示例内容。"}`);
}

migrate().catch((error) => {
  const code = typeof error?.code === "string" ? error.code : ["READ_ONLY_PREVIEW", "DATABASE_NOT_CONFIGURED", "INVALID_ARGUMENT"].includes(error?.message) ? error.message : "CONNECTION_OR_SCHEMA_ERROR";
  // Driver messages may contain connection information. Print only a safe failure code.
  console.error(`旅行表迁移失败（${code}）。请检查数据库连接及建表权限。`);
  process.exitCode = 1;
});
