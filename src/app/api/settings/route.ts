import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getSettings());
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  return NextResponse.json(await updateSettings(data));
}
