import { NextRequest, NextResponse } from "next/server";
import { addFeature, deleteFeature, getFeatures, reorderFeatures, updateFeature } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json(await getFeatures());
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();

  if (data.action === "reorder") {
    if (!Array.isArray(data.ids)) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }
    return NextResponse.json(await reorderFeatures(data.ids));
  }

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
