import { NextRequest, NextResponse } from "next/server";
import { reorderFeatures } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  if (!Array.isArray(data.ids)) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  return NextResponse.json(await reorderFeatures(data.ids));
}
