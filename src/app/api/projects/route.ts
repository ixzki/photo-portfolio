import { NextRequest, NextResponse } from "next/server";
import {
  getAllProjects, getProjectById, getProjectBySlug,
  createProject, updateProject, deleteProject,
  addRow, updateRow, deleteRow, addImage, updateImage, deleteImage,
  reorderProjects, reorderRows, reorderImages,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LAYOUT_OPTIONS } from "@/lib/types";

const layoutValues = new Set<string>(LAYOUT_OPTIONS.map((option) => option.value));

function isHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateProjectInput(data: Record<string, unknown>) {
  const errors: string[] = [];
  const slug = String(data.slug || "").trim();

  if (!slug) errors.push("请填写 slug。");
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push("slug 只能使用小写字母、数字和连字符，例如 city-walk。");
  }
  if (!String(data.titleZh || "").trim()) errors.push("请填写标题。");
  if (String(data.featureUrl || "").trim() && !isHttpUrl(data.featureUrl)) {
    errors.push("请填写有效的首页精选图 URL。");
  }
  if (!isHttpUrl(data.coverUrl)) errors.push("请填写有效的封面图 URL。");
  if (!isHttpUrl(data.thumbUrl)) errors.push("请填写有效的缩略图 URL。");

  return errors;
}

function validateImageInput(image: Record<string, unknown> | undefined) {
  const errors: string[] = [];
  if (!image || !isHttpUrl(image.url)) errors.push("请填写有效的图片 URL。");
  if (image && Number(image.width) <= 0) errors.push("图片宽度必须大于 0。");
  if (image && Number(image.height) <= 0) errors.push("图片高度必须大于 0。");
  return errors;
}

function isLayoutValue(value: unknown) {
  return typeof value === "string" && layoutValues.has(value);
}

function writeErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "操作失败。";
  const needsDatabase = message.includes("数据库未配置") || message.includes("DATABASE_URL");
  return NextResponse.json(
    { error: needsDatabase ? "请先提供在线数据库链接 DATABASE_URL。" : message },
    { status: needsDatabase ? 503 : 500 },
  );
}

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

    if (action === "reorderProjects") {
      if (!Array.isArray(data.ids)) {
        return NextResponse.json({ error: "ids array required" }, { status: 400 });
      }
      try {
        return NextResponse.json(await reorderProjects(data.ids));
      } catch (error) {
        return writeErrorResponse(error);
      }
    }
    if (action === "addRow") {
      if (!isLayoutValue(data.layout)) {
        return NextResponse.json({ error: "请选择有效的行形式。" }, { status: 400 });
      }
      try {
        const row = await addRow(projectId, data.layout);
        if (!row) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        return NextResponse.json(await getProjectById(projectId));
      } catch (error) {
        return writeErrorResponse(error);
      }
    }
    if (action === "reorderRows") {
      if (!Array.isArray(data.rowIds)) {
        return NextResponse.json({ error: "rowIds array required" }, { status: 400 });
      }
      try {
        const updated = await reorderRows(projectId, data.rowIds);
        if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        return NextResponse.json(updated);
      } catch (error) {
        return writeErrorResponse(error);
      }
    }
    if (action === "updateRow") {
      if (!data.data || typeof data.data !== "object") {
        return NextResponse.json({ error: "更新内容不能为空。" }, { status: 400 });
      }
      if ("layout" in data.data && !isLayoutValue(data.data.layout)) {
        return NextResponse.json({ error: "请选择有效的行形式。" }, { status: 400 });
      }
      try {
        const row = await updateRow(projectId, data.rowId, data.data);
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(await getProjectById(projectId));
      } catch (error) {
        return writeErrorResponse(error);
      }
    }
    if (action === "deleteRow") {
      try {
        const result = await deleteRow(projectId, data.rowId);
        if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(await getProjectById(projectId));
      } catch (error) {
        return writeErrorResponse(error);
      }
    }
    if (action === "addImage") {
      const errors = validateImageInput(data.image);
      if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });
      const img = await addImage(projectId, data.rowId, data.image);
      if (!img) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(await getProjectById(projectId));
    }
    if (action === "reorderImages") {
      if (!Array.isArray(data.imageIds)) {
        return NextResponse.json({ error: "imageIds array required" }, { status: 400 });
      }
      const updated = await reorderImages(projectId, data.rowId, data.imageIds);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(updated);
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
  const errors = validateProjectInput(data);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const existing = await getProjectBySlug(data.slug);
  if (existing) {
    return NextResponse.json({ error: "slug 已存在，请换一个。" }, { status: 409 });
  }

  try {
    const project = await createProject({
      slug: data.slug,
      titleZh: data.titleZh,
      design: data.design || "",
      city: data.city || "",
      time: data.time || "",
      equipment: data.equipment || "",
      featureUrl: String(data.featureUrl || "").trim() || data.coverUrl,
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
  } catch (error) {
    return writeErrorResponse(error);
  }
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

  const payload = { ...data, featureUrl: String(data.featureUrl || "").trim() || data.coverUrl };
  const errors = validateProjectInput(payload);
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const existing = await getProjectBySlug(payload.slug);
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "slug 已存在，请换一个。" }, { status: 409 });
  }

  try {
    const updated = await updateProject(id, payload);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return writeErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  try {
    const result = await deleteProject(id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return writeErrorResponse(error);
  }
}
