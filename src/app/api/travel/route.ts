import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isReadOnlyPreview } from "@/lib/preview-config.mjs";
import { MAX_TRAVEL_BYTES, TravelValidationError, validateTravelDocument } from "@/lib/travel-content";
import { assertTravelWriteRequest, readTravelJson, TravelRequestError } from "@/lib/travel-request";
import {
  createTravel, deleteTravel, getTravelById, getTravelSummaries,
  isTravelTableMissing, TravelStorageError, updateTravel,
} from "@/lib/travel-db";

const privateHeaders = { "Cache-Control": "private, no-store" };

function failure(error: unknown) {
  if (error instanceof TravelValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers: privateHeaders });
  if (error instanceof TravelStorageError || error instanceof TravelRequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  if (isTravelTableMissing(error)) return NextResponse.json({ error: "旅行数据表尚未初始化，请运行项目的旅行迁移脚本。" }, { status: 503, headers: privateHeaders });
  // Do not expose driver exceptions: their messages can contain credentials or query content.
  return NextResponse.json({ error: "旅行数据暂时无法读写，请稍后重试。" }, { status: 503, headers: privateHeaders });
}

function assertWrite(request: NextRequest) {
  if (isReadOnlyPreview()) throw new TravelRequestError("当前为只读预览，旅行内容不能修改。", 403);
  assertTravelWriteRequest(request);
}

function refreshTravel() {
  revalidatePath("/travel");
  revalidatePath("/travel/[slug]", "page");
  revalidatePath("/admin/travel");
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id !== null) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id)) throw new TravelRequestError("旅行 ID 不正确。", 400);
      const document = await getTravelById(id);
      return document ? NextResponse.json(document, { headers: privateHeaders }) : NextResponse.json({ error: "旅行不存在。" }, { status: 404, headers: privateHeaders });
    }
    return NextResponse.json(await getTravelSummaries(), { headers: privateHeaders });
  } catch (error) { return failure(error); }
}

async function save(request: NextRequest, mode: "create" | "update") {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    assertWrite(request);
    const document = validateTravelDocument(await readTravelJson(request, MAX_TRAVEL_BYTES));
    const saved = await (mode === "create" ? createTravel(document) : updateTravel(document));
    refreshTravel();
    return NextResponse.json(saved, { status: mode === "create" ? 201 : 200, headers: privateHeaders });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) { return save(request, "create"); }
export async function PUT(request: NextRequest) { return save(request, "update"); }

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth) return auth;
  try {
    assertWrite(request);
    const id = request.nextUrl.searchParams.get("id") || "";
    const version = request.nextUrl.searchParams.get("revision");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id) || version === null || !/^\d+$/.test(version) || !Number.isSafeInteger(Number(version))) {
      throw new TravelRequestError("请提供有效的旅行 ID 和版本号。", 400);
    }
    await deleteTravel(id, Number(version));
    refreshTravel();
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
