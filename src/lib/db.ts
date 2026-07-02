import { neon } from "@neondatabase/serverless";
import { cache } from "react";
import { seedFeatures, seedProjects, seedSettings } from "./data";
import { isRetryableReadQuery, withDatabaseRetry } from "./db-retry-utils.mjs";
import { hasManualProjectOrder, sortProjectsForDisplay } from "./project-order-utils.mjs";
import { FeatureItem, Image, LayoutType, MediaItem, Project, Row, SiteSettings } from "./types";

type SqlClient = ReturnType<typeof neon>;
type ProjectCreateInput = Omit<Project, "id" | "rows"> & { rows?: Omit<Row, "id" | "images">[] };
let sqlClient: SqlClient | null = null;
let retryingSqlClient: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "";
}

function getSql() {
  if (!databaseUrl()) throw new Error("数据库未配置，请先提供在线数据库链接 DATABASE_URL。");
  if (!sqlClient) sqlClient = neon(databaseUrl());
  return sqlClient;
}

function getRetryingSql() {
  const sql = getSql();
  if (!retryingSqlClient) {
    retryingSqlClient = (async (...args: Parameters<SqlClient>) => {
      const [query] = args;
      if (isRetryableReadQuery(query)) {
        return withDatabaseRetry(() => sql(...args));
      }
      return sql(...args);
    }) as SqlClient;
  }
  return retryingSqlClient;
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
    createdAt: project.createdAt || undefined,
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
  try {
    await schemaReady;
  } catch (error) {
    schemaReady = null;
    throw error;
  }
}

export async function setupDatabaseSchema() {
  await ensureSchema(getSql());
}

async function db() {
  return getRetryingSql();
}

async function updateProjectData(
  projectId: string,
  updater: (current: Project) => Project | null,
): Promise<Project | null> {
  const sql = await db();

  const rows = await sql("SELECT data FROM portfolio_projects WHERE id = $1 LIMIT 1", [projectId]) as Array<{ data: Project }>;
  if (!rows[0]) return null;

  const current = normalizeProject(rows[0].data);
  const next = updater(current);
  if (!next) return null;

  const updated = normalizeProject({ ...next, id: current.id });
  const updatedRows = await sql(
    "UPDATE portfolio_projects SET slug = $1, visible = $2, order_index = $3, data = $4::jsonb WHERE id = $5 RETURNING data",
    [updated.slug, updated.visible, updated.order, JSON.stringify(updated), projectId],
  ) as Array<{ data: Project }>;
  return updatedRows[0] ? normalizeProject(updatedRows[0].data) : null;
}

// ---- Health check ----
export function hasDatabase(): boolean {
  return Boolean(databaseUrl());
}

export async function checkConnection(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// ---- Projects ----
async function readProjects(visibleOnly: boolean): Promise<Project[]> {
  const sql = await db();
  const rows = await sql(
    visibleOnly
      ? "SELECT data FROM portfolio_projects WHERE visible = true"
      : "SELECT data FROM portfolio_projects"
  ) as Array<{ data: Project }>;
  return sortProjectsForDisplay(rows.map((r) => normalizeProject(r.data)));
}

async function getProjectsImpl(): Promise<Project[]> {
  return readProjects(true);
}

async function getAllProjectsImpl(): Promise<Project[]> {
  return readProjects(false);
}

export const getProjects = cache(getProjectsImpl);
export const getAllProjects = cache(getAllProjectsImpl);

export const getProjectById = cache(async function getProjectById(id: string): Promise<Project | null> {
  const sql = await db();
  const rows = await sql("SELECT data FROM portfolio_projects WHERE id = $1 LIMIT 1", [id]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
});

export const getProjectBySlug = cache(async function getProjectBySlug(slug: string): Promise<Project | null> {
  const sql = await db();
  const rows = await sql("SELECT data FROM portfolio_projects WHERE slug = $1 LIMIT 1", [slug]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
});

export const getVisibleProjectBySlug = cache(async function getVisibleProjectBySlug(slug: string): Promise<Project | null> {
  const sql = await db();
  const rows = await sql(
    "SELECT data FROM portfolio_projects WHERE slug = $1 AND visible = true LIMIT 1",
    [slug],
  ) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
});

export const getProjectDetailData = cache(async function getProjectDetailData(slug: string): Promise<{
  project: Project | null;
  nextProject: Pick<Project, "slug" | "titleZh"> | null;
}> {
  const projects = await getProjects();
  const currentIndex = projects.findIndex((project) => project.slug === slug);
  const project = currentIndex >= 0 ? projects[currentIndex] : null;
  const nextProject = projects.length > 0
    ? projects[(currentIndex >= 0 ? currentIndex + 1 : 0) % projects.length]
    : null;

  return {
    project,
    nextProject: nextProject ? { slug: nextProject.slug, titleZh: nextProject.titleZh } : null,
  };
});

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  const sql = await db();
  const existingRows = await sql("SELECT data FROM portfolio_projects") as Array<{ data: Project }>;
  const existingProjects = existingRows.map((row) => normalizeProject(row.data));
  const requestedOrder = Number(input.order);
  const hasRequestedOrder = Number.isFinite(requestedOrder) && requestedOrder > 0;
  const shouldShiftManualOrder = !hasRequestedOrder && hasManualProjectOrder(existingProjects);

  if (shouldShiftManualOrder) {
    for (const existingProject of existingProjects) {
      const shifted = normalizeProject({ ...existingProject, order: existingProject.order + 1 });
      await sql(
        "UPDATE portfolio_projects SET order_index = $1, data = $2::jsonb WHERE id = $3",
        [shifted.order, JSON.stringify(shifted), shifted.id],
      );
    }
  }

  const project = normalizeProject({
    ...input,
    id: generateId(),
    createdAt: input.createdAt || new Date().toISOString(),
    rows: [],
    visible: input.visible ?? true,
    order: hasRequestedOrder ? requestedOrder : 0,
  });

  await sql(
    "INSERT INTO portfolio_projects (id, slug, visible, order_index, data) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [project.id, project.slug, project.visible, project.order, JSON.stringify(project)],
  );
  return project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
  return updateProjectData(id, (current) => ({ ...current, ...data, id: current.id }));
}

export async function deleteProject(id: string): Promise<boolean> {
  const sql = await db();

  const rows = await sql("DELETE FROM portfolio_projects WHERE id = $1 RETURNING data", [id]) as Array<{ data: Project }>;
  if (rows.length === 0) return false;
  const project = normalizeProject(rows[0].data);

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

  for (const project of reordered) {
    await sql(
      "UPDATE portfolio_projects SET order_index = $1, data = $2::jsonb WHERE id = $3",
      [project.order, JSON.stringify(project), project.id],
    );
  }
  return reordered;
}

export async function addRow(projectId: string, layout: LayoutType): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    const row: Row = { id: generateId(), layout, order: project.rows.length, images: [] };
    return { ...project, rows: [...project.rows, row] };
  });
}

export async function updateRow(projectId: string, rowId: string, data: Partial<Row>): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    if (!project.rows.some((item) => item.id === rowId)) return null;
    const rows = project.rows.map((item) => (item.id === rowId ? { ...item, ...data } : item));
    return { ...project, rows };
  });
}

export async function deleteRow(projectId: string, rowId: string): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    const nextRows = project.rows.filter((row) => row.id !== rowId);
    if (nextRows.length === project.rows.length) return null;
    return { ...project, rows: nextRows.map((row, order) => ({ ...row, order })) };
  });
}

export async function reorderRows(projectId: string, rowIds: string[]): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    const rowById = new Map(project.rows.map((row) => [row.id, row]));
    const orderedRows = rowIds
      .map((rowId, order) => {
        const row = rowById.get(rowId);
        return row ? { ...row, order } : null;
      })
      .filter((row): row is Row => row !== null);

    const rowIdSet = new Set(rowIds);
    const missingRows = project.rows
      .filter((row) => !rowIdSet.has(row.id))
      .map((row, index) => ({ ...row, order: orderedRows.length + index }));

    return { ...project, rows: [...orderedRows, ...missingRows] };
  });
}

export async function addImage(projectId: string, rowId: string, image: Omit<Image, "id" | "order">): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    const row = project.rows.find((item) => item.id === rowId);
    if (!row) return null;
    const img: Image = { ...image, id: generateId(), order: row.images.length };
    const rows = project.rows.map((item) => (
      item.id === rowId ? { ...item, images: [...item.images, img] } : item
    ));
    return { ...project, rows };
  });
}

export async function updateImage(projectId: string, rowId: string, imageId: string, data: Partial<Image>): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    let updated = false;
    const rows = project.rows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        images: row.images.map((image) => {
          if (image.id !== imageId) return image;
          updated = true;
          return { ...image, ...data };
        }),
      };
    });
    return updated ? { ...project, rows } : null;
  });
}

export async function deleteImage(projectId: string, rowId: string, imageId: string): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    let deleted = false;
    const rows = project.rows.map((row) => {
      if (row.id !== rowId) return row;
      const images = row.images.filter((image) => image.id !== imageId);
      deleted = deleted || images.length !== row.images.length;
      return { ...row, images: images.map((image, order) => ({ ...image, order })) };
    });
    return deleted ? { ...project, rows } : null;
  });
}

export async function reorderImages(projectId: string, rowId: string, imageIds: string[]): Promise<Project | null> {
  return updateProjectData(projectId, (project) => {
    if (!project.rows.some((row) => row.id === rowId)) return null;

    const rows = project.rows.map((row) => {
      if (row.id !== rowId) return row;
      const imageById = new Map(row.images.map((image) => [image.id, image]));
      const orderedImages = imageIds
        .map((imageId, order) => {
          const image = imageById.get(imageId);
          return image ? { ...image, order } : null;
        })
        .filter((image): image is Image => image !== null);
      const imageIdSet = new Set(imageIds);
      const missingImages = row.images
        .filter((image) => !imageIdSet.has(image.id))
        .map((image, index) => ({ ...image, order: orderedImages.length + index }));
      return { ...row, images: [...orderedImages, ...missingImages] };
    });

    return { ...project, rows };
  });
}

// ---- Features ----
async function readFeatures(visibleProjectsOnly: boolean): Promise<FeatureItem[]> {
  const sql = await db();
  const featureRows = await sql(
    "SELECT data FROM portfolio_features ORDER BY order_index ASC, id ASC"
  ) as Array<{ data: FeatureItem }>;
  const projectRows = await sql(
    visibleProjectsOnly
      ? "SELECT data FROM portfolio_projects WHERE visible = true"
      : "SELECT data FROM portfolio_projects"
  ) as Array<{ data: Project }>;
  const features = featureRows.map((r) => normalizeFeature(r.data));
  const allProjects = sortProjectsForDisplay(projectRows.map((r) => normalizeProject(r.data)));

  // Resolve latest project titles and covers for project-type features
  const projectBySlug = new Map(allProjects.map((p) => [p.slug, p]));

  return features
    .map((f) => {
      if (f.type === "project") {
        if (!f.projectSlug) return visibleProjectsOnly ? null : f;
        const project = projectBySlug.get(f.projectSlug);
        if (!project) return visibleProjectsOnly ? null : f;
        return { ...f, projectTitle: project.titleZh, projectCoverUrl: project.featureUrl || project.coverUrl };
      }
      return f;
    })
    .filter((feature): feature is FeatureItem => feature !== null);
}

async function getFeaturesImpl(): Promise<FeatureItem[]> {
  return readFeatures(false);
}

async function getPublicFeaturesImpl(): Promise<FeatureItem[]> {
  return readFeatures(true);
}

export const getFeatures = cache(getFeaturesImpl);
export const getPublicFeatures = cache(getPublicFeaturesImpl);

export async function getFeatureSummary(): Promise<{
  features: FeatureItem[];
  projects: Project[];
}> {
  const sql = await db();
  const featureRows = await sql(
    "SELECT data FROM portfolio_features ORDER BY order_index ASC, id ASC"
  ) as Array<{ data: FeatureItem }>;
  const projectRows = await sql("SELECT data FROM portfolio_projects") as Array<{ data: Project }>;
  const projects = sortProjectsForDisplay(projectRows.map((row) => normalizeProject(row.data)));
  const projectBySlug = new Map(projects.map((project) => [project.slug, project]));
  const features = featureRows.map((row) => {
    const feature = normalizeFeature(row.data);
    if (feature.type === "project" && feature.projectSlug) {
      const project = projectBySlug.get(feature.projectSlug);
      if (project) {
        return { ...feature, projectTitle: project.titleZh, projectCoverUrl: project.featureUrl || project.coverUrl };
      }
    }
    return feature;
  });
  return { features, projects };
}

export async function addFeature(input: Omit<FeatureItem, "id">): Promise<FeatureItem> {
  const feature = normalizeFeature({ ...input, id: generateId() });
  const sql = await db();

  await sql(
    "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb)",
    [feature.id, feature.order, JSON.stringify(feature)],
  );
  return feature;
}

export async function replaceFeatures(input: FeatureItem[]): Promise<FeatureItem[]> {
  const features = input.map((feature, order) => normalizeFeature({
    ...feature,
    id: feature.id || generateId(),
    order,
  }));
  const sql = await db();

  await sql("DELETE FROM portfolio_features");
  for (const feature of features) {
    await sql(
      "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb)",
      [feature.id, feature.order, JSON.stringify(feature)],
    );
  }

  return readFeatures(false);
}

export async function updateFeature(id: string, data: Partial<FeatureItem>): Promise<FeatureItem | null> {
  const features = await getFeatures();
  const current = features.find((f) => f.id === id);
  if (!current) return null;
  const updated = normalizeFeature({ ...current, ...data });

  const sql = await db();

  await sql(
    "UPDATE portfolio_features SET order_index = $1, data = $2::jsonb WHERE id = $3",
    [updated.order, JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteFeature(id: string): Promise<boolean> {
  const sql = await db();

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

  await sql(
    "UPDATE portfolio_media SET data = $1::jsonb WHERE id = $2",
    [JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  const sql = await db();

  const rows = await sql("DELETE FROM portfolio_media WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  return rows.length > 0;
}

// ---- Settings ----
async function getSettingsImpl(): Promise<SiteSettings> {
  const sql = await db();

  const rows = await sql("SELECT data FROM portfolio_settings WHERE id = 'default' LIMIT 1") as Array<{ data: SiteSettings }>;
  if (!rows[0]) throw new Error("数据库中缺少网站设置记录，请先初始化 portfolio_settings。");
  return normalizeSettings(rows[0].data);
}

export const getSettings = cache(getSettingsImpl);

export async function updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const updated = normalizeSettings({ ...(await getSettings()), ...data });
  const sql = await db();

  await sql(
    "INSERT INTO portfolio_settings (id, data) VALUES ('default', $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
    [JSON.stringify(updated)],
  );
  return updated;
}
