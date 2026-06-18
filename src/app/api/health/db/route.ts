import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkConnection, getAllProjects, getFeatures, getSettings, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

type HealthCheck = {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function measure(name: string, task: () => Promise<string>): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const detail = await task();
    return { name, ok: true, durationMs: Date.now() - startedAt, detail };
  } catch (error) {
    return { name, ok: false, durationMs: Date.now() - startedAt, error: errorMessage(error) };
  }
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: false,
      checkedAt: new Date().toISOString(),
      checks: [
        {
          name: "database-config",
          ok: false,
          durationMs: 0,
          error: "DATABASE_URL is not configured.",
        },
      ],
    }, { status: 503 });
  }

  const checks = [
    await measure("connection", async () => {
      if (!(await checkConnection())) throw new Error("SELECT 1 failed.");
      return "SELECT 1 ok";
    }),
    await measure("settings", async () => {
      const settings = await getSettings();
      return `siteName=${settings.siteName}`;
    }),
    await measure("projects", async () => {
      const projects = await getAllProjects();
      return `count=${projects.length}`;
    }),
    await measure("features", async () => {
      const features = await getFeatures();
      return `count=${features.length}`;
    }),
  ];
  const ok = checks.every((check) => check.ok);

  return NextResponse.json({
    ok,
    checkedAt: new Date().toISOString(),
    checks,
  }, { status: ok ? 200 : 503 });
}
