import { neon } from "@neondatabase/serverless";
import { databaseUrl, isDemoPreview, isReadOnlyPreview } from "./preview-config.mjs";
import { withDatabaseRetry } from "./db-retry-utils.mjs";
import { initialTravel } from "./travel-seed.mjs";
import { travelSummary, validateTravelDocument, type TravelDocument, type TravelSummary } from "./travel-content";
import { assertJourney, type Coordinate } from "./journey";

export interface PublishedJourneyOverview {
  slug: string;
  shade: string;
  title: string;
  segments: Coordinate[][];
}

export class TravelStorageError extends Error {
  readonly status: number;
  constructor(message: string, status = 503) { super(message); this.name = "TravelStorageError"; this.status = status; }
}

function sqlClient() {
  const url = databaseUrl();
  if (!url) throw new TravelStorageError("数据库尚未配置。");
  return neon(url);
}

export function isTravelTableMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01";
}

function canWrite() {
  if (isReadOnlyPreview()) throw new TravelStorageError("当前为只读预览，旅行内容不能修改。", 403);
}

function documentFromRow(row: Record<string, unknown>): TravelDocument {
  const content = row.data as TravelDocument;
  return validateTravelDocument({
    ...content, id: row.id, slug: row.slug, visible: row.visible, revision: row.revision,
    updatedAt: new Date(row.updated_at as string).toISOString(),
  });
}

async function read(query: string, parameters: string[] = []) {
  const sql = sqlClient();
  return withDatabaseRetry(() => sql(query, parameters));
}

export async function getTravelSummaries(): Promise<TravelSummary[]> {
  if (isDemoPreview()) return [travelSummary(initialTravel())];
  // Avoid transferring every coordinate into the admin list.
  const rows = await read(`SELECT id, slug, visible, revision, updated_at,
    data->'journey'->>'title' AS title, data->>'shade' AS shade,
    jsonb_array_length(data->'journey'->'stops') AS stop_count,
    COALESCE((SELECT sum(jsonb_array_length(segment)) FROM jsonb_array_elements(data->'journey'->'segments') AS segment), 0)::int AS point_count
    FROM portfolio_travel ORDER BY updated_at DESC, id ASC`);
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id), slug: String(row.slug), title: String(row.title), shade: String(row.shade), visible: row.visible === true,
    revision: Number(row.revision), updatedAt: new Date(row.updated_at as string).toISOString(),
    stopCount: Number(row.stop_count), pointCount: Number(row.point_count),
  }));
}

export async function getTravelById(id: string): Promise<TravelDocument | null> {
  if (isDemoPreview()) { const seed = initialTravel(); return seed.id === id ? seed : null; }
  const rows = await read("SELECT id, slug, visible, revision, updated_at, data FROM portfolio_travel WHERE id = $1", [id]);
  return rows[0] ? documentFromRow(rows[0]) : null;
}

export async function readPublishedTravels(slug?: string): Promise<TravelDocument[]> {
  const rows = await read(`SELECT id, slug, visible, revision, updated_at, data FROM portfolio_travel
    WHERE visible = true${slug === undefined ? "" : " AND slug = $1"} ORDER BY updated_at DESC, id ASC`, slug === undefined ? [] : [slug]);
  return rows.map(documentFromRow);
}

export async function readPublishedTravelSlugs(): Promise<string[]> {
  const rows = await read("SELECT slug FROM portfolio_travel WHERE visible = true ORDER BY updated_at DESC, id ASC");
  return rows.map((row: Record<string, unknown>) => String(row.slug));
}

export async function readPublishedTravelOverview(slug: string): Promise<PublishedJourneyOverview | undefined> {
  // The overview never downloads story text, photos or per-point time/altitude
  // from Neon. Cache each route separately instead of one growing route array.
  const rows = await read(`SELECT slug, data->>'shade' AS shade,
    data->'journey'->>'title' AS title, data->'journey'->'segments' AS segments
    FROM portfolio_travel WHERE visible = true AND slug = $1`, [slug]);
  if (!rows[0]) return undefined;
  const row = rows[0];
  const geometry = { title: row.title, segments: row.segments, stops: [] };
  assertJourney(geometry);
  return { slug: String(row.slug), shade: String(row.shade), title: geometry.title, segments: geometry.segments };
}

function translateWriteError(error: unknown): never {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    throw new TravelStorageError("此网址名称或旅行 ID 已存在，请换一个名称。", 409);
  }
  throw error;
}

export async function createTravel(input: TravelDocument): Promise<TravelDocument> {
  canWrite();
  const document = validateTravelDocument(input);
  if (document.revision !== 0) throw new TravelStorageError("新建旅行的版本必须为 0。", 400);
  const sql = sqlClient();
  const saved = { ...document, revision: 1, updatedAt: new Date().toISOString() };
  try {
    const rows = await sql(`INSERT INTO portfolio_travel (id, slug, visible, revision, updated_at, data)
      VALUES ($1, $2, $3, 1, $4::timestamptz, $5::jsonb)
      RETURNING id, slug, visible, revision, updated_at, data`,
    [saved.id, saved.slug, saved.visible, saved.updatedAt, JSON.stringify(saved)]);
    return documentFromRow(rows[0]);
  } catch (error) { translateWriteError(error); }
}

export async function updateTravel(input: TravelDocument): Promise<TravelDocument> {
  canWrite();
  const document = validateTravelDocument(input);
  const sql = sqlClient();
  const saved = { ...document, revision: document.revision + 1, updatedAt: new Date().toISOString() };
  try {
    // One atomic compare-and-swap prevents a stale editor from overwriting another save.
    const rows = await sql(`UPDATE portfolio_travel SET slug = $2, visible = $3, revision = revision + 1,
      updated_at = $4::timestamptz, data = $5::jsonb WHERE id = $1 AND revision = $6
      RETURNING id, slug, visible, revision, updated_at, data`,
    [saved.id, saved.slug, saved.visible, saved.updatedAt, JSON.stringify(saved), document.revision]);
    if (!rows[0]) throw new TravelStorageError("旅行已被修改或删除。请重新加载后再保存，当前编辑内容尚未覆盖服务器。", 409);
    return documentFromRow(rows[0]);
  } catch (error) { translateWriteError(error); }
}

export async function deleteTravel(id: string, revision: number): Promise<void> {
  canWrite();
  const sql = sqlClient();
  const rows = await sql("DELETE FROM portfolio_travel WHERE id = $1 AND revision = $2 RETURNING id", [id, revision]);
  if (!rows[0]) throw new TravelStorageError("旅行已被修改或删除。请重新加载后再删除。", 409);
}
