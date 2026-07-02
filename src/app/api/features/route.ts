import { NextRequest, NextResponse } from "next/server";
import { addFeature, deleteFeature, getFeatures, getProjectBySlug, reorderFeatures, replaceFeatures, updateFeature } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { FeatureItem } from "@/lib/types";

function isHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function validateFeatureInput(data: Record<string, unknown>) {
  const type = data.type === "image" ? "image" : "project";
  const errors: string[] = [];

  if (type === "project") {
    const slug = String(data.projectSlug || "").trim();
    if (!slug) errors.push("请选择关联项目。");
    if (slug && !(await getProjectBySlug(slug))) errors.push("关联项目不存在。");
  } else {
    if (!isHttpUrl(data.imageUrl)) errors.push("请填写有效的图片 URL。");
    if (!String(data.imageTitle || "").trim()) errors.push("请填写显示标题。");
  }

  return errors;
}

function toFeatureItem(data: Record<string, unknown>, order: number): FeatureItem {
  const type = data.type === "image" ? "image" : "project";
  return {
    id: typeof data.id === "string" ? data.id : "",
    type,
    projectSlug: typeof data.projectSlug === "string" ? data.projectSlug : undefined,
    projectTitle: typeof data.projectTitle === "string" ? data.projectTitle : undefined,
    projectCoverUrl: typeof data.projectCoverUrl === "string" ? data.projectCoverUrl : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
    imageTitle: typeof data.imageTitle === "string" ? data.imageTitle : undefined,
    order,
  };
}

function writeErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "操作失败。";
  const needsDatabase = message.includes("数据库未配置") || message.includes("DATABASE_URL");
  return NextResponse.json(
    { error: needsDatabase ? "请先提供在线数据库链接 DATABASE_URL。" : message },
    { status: needsDatabase ? 503 : 500 },
  );
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getFeatures());
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();

  if (data.action === "replace") {
    if (!Array.isArray(data.features)) {
      return NextResponse.json({ error: "features array required" }, { status: 400 });
    }

    const features: FeatureItem[] = [];
    for (const [order, feature] of data.features.entries()) {
      if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
        return NextResponse.json({ error: "features item invalid" }, { status: 400 });
      }
      const normalized = toFeatureItem(feature as Record<string, unknown>, order);
      const errors = await validateFeatureInput(normalized as unknown as Record<string, unknown>);
      if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });
      features.push(normalized);
    }

    try {
      return NextResponse.json(await replaceFeatures(features));
    } catch (error) {
      return writeErrorResponse(error);
    }
  }

  if (data.action === "reorder") {
    if (!Array.isArray(data.ids)) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    return NextResponse.json(await reorderFeatures(data.ids));
  }

  const errors = await validateFeatureInput(data);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const feature = await addFeature({
    type: data.type || "project",
    projectSlug: data.projectSlug || undefined,
    projectTitle: data.projectTitle || undefined,
    projectCoverUrl: data.projectCoverUrl || undefined,
    imageUrl: data.imageUrl || undefined,
    imageTitle: data.imageTitle || undefined,
    order: data.order ?? 0,
  });
  return NextResponse.json(feature, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || data.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const errors = await validateFeatureInput(data);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  const updated = await updateFeature(id, data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const result = await deleteFeature(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
