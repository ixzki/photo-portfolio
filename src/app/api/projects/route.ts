import { NextRequest, NextResponse } from "next/server";
import {
  getAllProjects, getProjectById, getProjectBySlug,
  createProject, updateProject, deleteProject,
  addRow, updateRow, deleteRow, addImage, updateImage, deleteImage,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (id) {
    const project = await getProjectById(id);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }
  if (slug) {
    const project = await getProjectBySlug(slug);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  }
  return NextResponse.json(await getAllProjects());
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();

  if (data.action) {
    const { projectId, action } = data;

    if (action === "addRow") {
      const row = await addRow(projectId, data.layout);
      if (!row) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "updateRow") {
      const row = await updateRow(projectId, data.rowId, data.data);
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "deleteRow") {
      const result = await deleteRow(projectId, data.rowId);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "addImage") {
      const img = await addImage(projectId, data.rowId, data.image);
      if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "updateImage") {
      const img = await updateImage(projectId, data.rowId, data.imageId, data.data);
      if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "deleteImage") {
      const result = await deleteImage(projectId, data.rowId, data.imageId);
      if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // POST - create new project
  const project = await createProject({
    slug: data.slug,
    titleZh: data.titleZh,
    design: data.design || "",
    city: data.city || "",
    time: data.time || "",
    equipment: data.equipment || "",
    coverUrl: data.coverUrl,
    thumbUrl: data.thumbUrl,
    coverW: parseInt(data.coverW) || 1440,
    coverH: parseInt(data.coverH) || 960,
    thumbW: parseInt(data.thumbW) || 1200,
    thumbH: parseInt(data.thumbH) || 800,
    order: parseInt(data.order) || 0,
    visible: data.visible === true || data.visible === "on",
  });
  return NextResponse.json(project, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const data = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || data.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const updated = await updateProject(id, data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const result = await deleteProject(id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
