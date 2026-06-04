import { NextRequest, NextResponse } from "next/server";
import { addMediaItem, deleteMediaItem, getMediaItems, updateMediaItem } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function isHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateMediaInput(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!isHttpUrl(data.url)) errors.push("请填写有效的图片 URL。");
  if (Number(data.width) <= 0) errors.push("图片宽度必须大于 0。");
  if (Number(data.height) <= 0) errors.push("图片高度必须大于 0。");
  return errors;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getMediaItems());
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  const errors = validateMediaInput(data);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const item = await addMediaItem({
    url: String(data.url).trim(),
    title: String(data.title || "").trim(),
    alt: String(data.alt || "").trim() || null,
    width: Number(data.width) || 1440,
    height: Number(data.height) || 960,
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || data.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const errors = validateMediaInput(data);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const item = await updateMediaItem(id, {
    url: String(data.url).trim(),
    title: String(data.title || "").trim(),
    alt: String(data.alt || "").trim() || null,
    width: Number(data.width) || 1440,
    height: Number(data.height) || 960,
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const result = await deleteMediaItem(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
