import { NextResponse } from "next/server";
import { invalidatePublicSettings } from "@/lib/public-cache-invalidation";
import { getSettings, updateSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getSettings(), { headers: privateHeaders });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  const settings = await updateSettings(data);
  invalidatePublicSettings();
  return NextResponse.json(settings, { headers: privateHeaders });
}
