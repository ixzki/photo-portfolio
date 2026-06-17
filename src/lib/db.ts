import { neon } from "@neondatabase/serverless";
import { seedFeatures, seedProjects, seedSettings } from "./data";
import { FeatureItem, Image, LayoutType, MediaItem, Project, Row, SiteSettings } from "./types";

type SqlClient = ReturnType<typeof neon>;
type ProjectCreateInput = Omit<Project, "id" | "rows"> & { rows?: Omit<Row, "id" | "images">[] };
let sqlClient: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "";
}

function getSql() {
  if (!databaseUrl()) return null;
  if (!sqlClient) sqlClient = neon(databaseUrl());
  return sqlClient;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function normalizeSettings(settings: Partial<SiteSettings>): SiteSettings {
  const base = { ...seedSettings, ...settings };
  const contacts = Array.isArray(base.contacts) && base.contacts.length > 0
    ? base.contacts
    : [
        { id: "email", label: "email", value: base.email || "" },
        { id: "location", label: "base", value: base.location || "" },
      ].filter((item) => item.value);

  return { ...base, faviconUrl: base.faviconUrl || "/favicon.ico", contacts };
}

function normalizeProject(project: Project): Project {
  const coverUrl = project.coverUrl || project.thumbUrl || "";
  return {
    ...project,
    coverUrl,
    thumbUrl: project.thumbUrl || coverUrl,
    featureUrl: project.featureUrl || coverUrl,
    coverW: Number(project.coverW) || 1440,
    coverH: Number(project.coverH) || 960,
    thumbW: Number(project.thumbW) || 1200,
    thumbH: Number(project.thumbH) || 800,
    order: Number(project.order) || 0,
    visible: project.visible !== false,
    rows: (project.rows || [])
      .map((row, rowIndex) => ({
        ...row,
        order: Number(row.order ?? rowIndex),
        images: (row.images || []).map((image, imageIndex) => ({
          ...image,
          width: Number(image.width) || 1440,
          height: Number(image.height) || 960,
          order: Number(image.order ?? imageIndex),
        })),
      }))
      .sort((a, b) => a.order - b.order),
  };
}

function normalizeFeature(feature: FeatureItem): FeatureItem {
  return { ...feature, order: Number(feature.order) || 0 };
}

function normalizeMediaItem(item: MediaItem): MediaItem {
  return {
    ...item,
    title: item.title || item.alt || "",
    alt: item.alt || null,
    width: Number(item.width) || 1440,
    height: Number(item.height) || 960,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

async function createTableIfMissing(sql: SqlClient, statement: string) {
  try {
    await sql(statement);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    if (code === "23505" || code === "42P07" || code === "42710") return;
    throw error;
  }
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await createTableIfMissing(sql, `
        CREATE TABLE IF NOT EXISTS portfolio_settings (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      await createTableIfMissing(sql, `
        CREATE TABLE IF NOT EXISTS portfolio_projects (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          visible BOOLEAN NOT NULL DEFAULT TRUE,
          order_index INTEGER NOT NULL DEFAULT 0,
          data JSONB NOT NULL
        )
      `);
      await createTableIfMissing(sql, `
        CREATE TABLE IF NOT EXISTS portfolio_features (
          id TEXT PRIMARY KEY,
          order_index INTEGER NOT NULL DEFAULT 0,
          data JSONB NOT NULL
        )
      `);
      await createTableIfMissing(sql, `
        CREATE TABLE IF NOT EXISTS portfolio_media (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          data JSONB NOT NULL
        )
      `);

      const settingsRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_settings") as Array<{ count: string }>;
      if (Number(settingsRows[0]?.count || 0) === 0) {
        await sql(
          "INSERT INTO portfolio_settings (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING",
          ["default", JSON.stringify(normalizeSettings(seedSettings))],
        );
      }

      const projectRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_projects") as Array<{ count: string }>;
      if (Number(projectRows[0]?.count || 0) === 0) {
        for (const project of seedProjects) {
          await sql(
            "INSERT INTO portfolio_projects (id, slug, visible, order_index, data) VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (id) DO NOTHING",
            [project.id, project.slug, project.visible, project.order, JSON.stringify(normalizeProject(project))],
          );
        }
      }

      const featureRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_features") as Array<{ count: string }>;
      if (Number(featureRows[0]?.count || 0) === 0) {
        for (const feature of seedFeatures) {
          await sql(
            "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING",
            [feature.id, feature.order, JSON.stringify(normalizeFeature(feature))],
          );
        }
      }
    })();
  }
  return schemaReady;
}

async function db() {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  return sql;
}

// ---- Health check ----
export function hasDatabase(): boolean {
  return Boolean(databaseUrl());
}

export async function checkConnection(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  const sql = await db();
  if (!sql) return seedProjects.map(normalizeProject);

  const rows = await sql(
    "SELECT data FROM portfolio_projects WHERE visible = true ORDER BY order_index ASC"
  ) as Array<{ data: Project }>;
  return rows.map((r) => normalizeProject(r.data));
}

export async function getAllProjects(): Promise<Project[]> {
  const sql = await db();
  if (!sql) return seedProjects.map(normalizeProject);

  const rows = await sql(
    "SELECT data FROM portfolio_projects ORDER BY order_index ASC"
  ) as Array<{ data: Project }>;
  return rows.map((r) => normalizeProject(r.data));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const sql = await db();
  if (!sql) return seedProjects.find((p) => p.id === id) ?? null;

  const rows = await sql("SELECT data FROM portfolio_projects WHERE id = $1 LIMIT 1", [id]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const sql = await db();
  if (!sql) return seedProjects.find((p) => p.slug === slug) ?? null;

  const rows = await sql("SELECT data FROM portfolio_projects WHERE slug = $1 LIMIT 1", [slug]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
}

export async function getVisibleProjectBySlug(slug: string): Promise<Project | null> {
  const sql = await db();
  if (!sql) {
    const project = seedProjects.find((p) => p.slug === slug && p.visible !== false);
    return project ? normalizeProject(project) : null;
  }

  const rows = await sql(
    "SELECT data FROM portfolio_projects WHERE slug = $1 AND visible = true LIMIT 1",
    [slug],
  ) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
}

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  const project = normalizeProject({
    ...input,
    id: generateId(),
    rows: [],
    visible: input.visible ?? true,
    order: input.order ?? 0,
  });

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "INSERT INTO portfolio_projects (id, slug, visible, order_index, data) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [project.id, project.slug, project.visible, project.order, JSON.stringify(project)],
  );
  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  const current = await getProjectById(id);
  if (!current) return null;
  const updated = normalizeProject({ ...current, ...data, id: current.id });

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "UPDATE portfolio_projects SET slug = $1, visible = $2, order_index = $3, data = $4::jsonb WHERE id = $5",
    [updated.slug, updated.visible, updated.order, JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  const project = await getProjectById(id);
  if (!project) return false;

  const rows = await sql("DELETE FROM portfolio_projects WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  if (rows.length === 0) return false;

  await sql(
    "DELETE FROM portfolio_features WHERE data->>'type' = 'project' AND data->>'projectSlug' = $1",
    [project.slug],
  );
  return true;
}

export async function reorderProjects(ids: string[]): Promise<Project[]> {
  const projects = await getAllProjects();
  const reordered = ids
    .map((id, order) => {
      const project = projects.find((p) => p.id === id);
      return project ? { ...project, order } : null;
    })
    .filter((project): project is Project => project !== null);

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  for (const project of reordered) {
    await sql(
      "UPDATE portfolio_projects SET order_index = $1, data = $2::jsonb WHERE id = $3",
      [project.order, JSON.stringify(project), project.id],
    );
  }
  return reordered;
}

export async function addRow(projectId: string, layout: LayoutType): Promise<Row | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const row: Row = { id: generateId(), layout, order: project.rows.length, images: [] };
  await updateProject(projectId, { rows: [...project.rows, row] });
  return row;
}

export async function updateRow(projectId: string, rowId: string, data: Partial<Row>): Promise<Row | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const row = project.rows.find((item) => item.id === rowId);
  if (!row) return null;
  const rows = project.rows.map((item) => (item.id === rowId ? { ...item, ...data } : item));
  await updateProject(projectId, { rows });
  return rows.find((item) => item.id === rowId) || null;
}

export async function deleteRow(projectId: string, rowId: string): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project) return false;
  const nextRows = project.rows.filter((row) => row.id !== rowId);
  if (nextRows.length === project.rows.length) return false;
  await updateProject(projectId, { rows: nextRows.map((row, order) => ({ ...row, order })) });
  return true;
}

export async function reorderRows(projectId: string, rowIds: string[]): Promise<Project | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const rowById = new Map(project.rows.map((row) => [row.id, row]));
  const orderedRows = rowIds
    .map((rowId, order) => {
      const row = rowById.get(rowId);
      return row ? { ...row, order } : null;
    })
    .filter((row): row is Row => row !== null);

  const missingRows = project.rows
    .filter((row) => !rowIds.includes(row.id))
    .map((row, index) => ({ ...row, order: orderedRows.length + index }));

  const rows = [...orderedRows, ...missingRows];
  return updateProject(projectId, { rows });
}

export async function addImage(projectId: string, rowId: string, image: Omit<Image, "id" | "order">): Promise<Image | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const row = project.rows.find((item) => item.id === rowId);
  if (!row) return null;
  const img: Image = { ...image, id: generateId(), order: row.images.length };
  const rows = project.rows.map((item) => (
    item.id === rowId ? { ...item, images: [...item.images, img] } : item
  ));
  await updateProject(projectId, { rows });
  return img;
}

export async function updateImage(projectId: string, rowId: string, imageId: string, data: Partial<Image>): Promise<Image | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;
  let updatedImage: Image | null = null;
  const rows = project.rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      images: row.images.map((image) => {
        if (image.id !== imageId) return image;
        updatedImage = { ...image, ...data };
        return updatedImage;
      }),
    };
  });
  if (!updatedImage) return null;
  await updateProject(projectId, { rows });
  return updatedImage;
}

export async function deleteImage(projectId: string, rowId: string, imageId: string): Promise<boolean> {
  const project = await getProjectById(projectId);
  if (!project) return false;
  let deleted = false;
  const rows = project.rows.map((row) => {
    if (row.id !== rowId) return row;
    const images = row.images.filter((image) => image.id !== imageId);
    deleted = deleted || images.length !== row.images.length;
    return { ...row, images: images.map((image, order) => ({ ...image, order })) };
  });
  if (!deleted) return false;
  await updateProject(projectId, { rows });
  return true;
}

export async function reorderImages(projectId: string, rowId: string, imageIds: string[]): Promise<Project | null> {
  const project = await getProjectById(projectId);
  if (!project) return null;

  const rows = project.rows.map((row) => {
    if (row.id !== rowId) return row;
    const imageById = new Map(row.images.map((image) => [image.id, image]));
    const orderedImages = imageIds
      .map((imageId, order) => {
        const image = imageById.get(imageId);
        return image ? { ...image, order } : null;
      })
      .filter((image): image is Image => image !== null);
    const missingImages = row.images
      .filter((image) => !imageIds.includes(image.id))
      .map((image, index) => ({ ...image, order: orderedImages.length + index }));
    return { ...row, images: [...orderedImages, ...missingImages] };
  });

  return updateProject(projectId, { rows });
}

// ---- Features ----
export async function getFeatures(): Promise<FeatureItem[]> {
  const sql = await db();
  const features = sql
    ? (await sql(
        "SELECT data FROM portfolio_features ORDER BY order_index ASC"
      ) as Array<{ data: FeatureItem }>).map((r) => normalizeFeature(r.data))
    : seedFeatures.map(normalizeFeature);

  // Resolve latest project titles and covers for project-type features
  const allProjects = await getAllProjects();
  const projectBySlug = new Map(allProjects.map((p) => [p.slug, p]));

  return features.map((f) => {
    if (f.type === "project" && f.projectSlug) {
      const project = projectBySlug.get(f.projectSlug);
      if (project) {
        return { ...f, projectTitle: project.titleZh, projectCoverUrl: project.featureUrl || project.coverUrl };
      }
    }
    return f;
  });
}

export async function getPublicFeatures(): Promise<FeatureItem[]> {
  const features = await getFeatures();
  const visibleProjects = await getProjects();
  const projectBySlug = new Map(visibleProjects.map((p) => [p.slug, p]));

  return features
    .map((feature) => {
      if (feature.type !== "project") return feature;
      if (!feature.projectSlug) return null;
      const project = projectBySlug.get(feature.projectSlug);
      if (!project) return null;
      return { ...feature, projectTitle: project.titleZh, projectCoverUrl: project.featureUrl || project.coverUrl };
    })
    .filter((feature): feature is FeatureItem => feature !== null);
}

export async function addFeature(input: Omit<FeatureItem, "id">): Promise<FeatureItem> {
  const feature = normalizeFeature({ ...input, id: generateId() });
  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb)",
    [feature.id, feature.order, JSON.stringify(feature)],
  );
  return feature;
}

export async function updateFeature(id: string, data: Partial<FeatureItem>): Promise<FeatureItem | null> {
  const features = await getFeatures();
  const current = features.find((f) => f.id === id);
  if (!current) return null;
  const updated = normalizeFeature({ ...current, ...data });

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "UPDATE portfolio_features SET order_index = $1, data = $2::jsonb WHERE id = $3",
    [updated.order, JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteFeature(id: string): Promise<boolean> {
  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  const rows = await sql("DELETE FROM portfolio_features WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function reorderFeatures(ids: string[]): Promise<FeatureItem[]> {
  const features = await getFeatures();
  const reordered = ids
    .map((id, order) => {
      const feature = features.find((f) => f.id === id);
      return feature ? { ...feature, order } : null;
    })
    .filter((f): f is FeatureItem => f !== null);

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  for (const feature of reordered) {
    await sql(
      "UPDATE portfolio_features SET order_index = $1, data = $2::jsonb WHERE id = $3",
      [feature.order, JSON.stringify(feature), feature.id],
    );
  }
  return reordered;
}

// ---- Media library ----
export async function getMediaItems(): Promise<MediaItem[]> {
  const sql = await db();
  if (!sql) return [];

  const rows = await sql(
    "SELECT data FROM portfolio_media ORDER BY created_at DESC"
  ) as Array<{ data: MediaItem }>;
  return rows.map((row) => normalizeMediaItem(row.data));
}

export async function addMediaItem(input: Omit<MediaItem, "id" | "createdAt"> & { createdAt?: string }): Promise<MediaItem> {
  const item = normalizeMediaItem({
    ...input,
    id: generateId(),
    createdAt: input.createdAt || new Date().toISOString(),
  });

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "INSERT INTO portfolio_media (id, created_at, data) VALUES ($1, $2, $3::jsonb)",
    [item.id, item.createdAt, JSON.stringify(item)],
  );
  return item;
}

export async function updateMediaItem(id: string, data: Partial<MediaItem>): Promise<MediaItem | null> {
  const items = await getMediaItems();
  const current = items.find((item) => item.id === id);
  if (!current) return null;
  const updated = normalizeMediaItem({ ...current, ...data, id: current.id });

  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "UPDATE portfolio_media SET data = $1::jsonb WHERE id = $2",
    [JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  const rows = await sql("DELETE FROM portfolio_media WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  return rows.length > 0;
}

// ---- Settings ----
export async function getSettings(): Promise<SiteSettings> {
  const sql = await db();
  if (!sql) return normalizeSettings(seedSettings);

  const rows = await sql("SELECT data FROM portfolio_settings WHERE id = 'default' LIMIT 1") as Array<{ data: SiteSettings }>;
  return rows[0] ? normalizeSettings(rows[0].data) : normalizeSettings(seedSettings);
}

export async function updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const updated = normalizeSettings({ ...(await getSettings()), ...data });
  const sql = await db();
  if (!sql) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");

  await sql(
    "INSERT INTO portfolio_settings (id, data) VALUES ('default', $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
    [JSON.stringify(updated)],
  );
  return updated;
}
