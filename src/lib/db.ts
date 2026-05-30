import { neon } from "@neondatabase/serverless";
import { seedFeatures, seedProjects, seedSettings } from "./data";
import { FeatureItem, Image, LayoutType, Project, Row, SiteSettings } from "./types";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const FEATURES_FILE = path.join(DATA_DIR, "features.json");

type SqlClient = ReturnType<typeof neon>;
type ProjectCreateInput = Omit<Project, "id" | "rows"> & { rows?: Omit<Row, "id" | "images">[] };

let sqlClient: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "";
}

function shouldUseNeon() {
  return Boolean(databaseUrl()) && process.env.DISABLE_NEON !== "1";
}

function getSql() {
  if (!shouldUseNeon()) return null;
  if (!sqlClient) sqlClient = neon(databaseUrl());
  return sqlClient;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function readJson<T>(file: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(file)) {
    writeJson(file, fallback);
    return fallback;
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson<T>(file: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeSettings(settings: Partial<SiteSettings>): SiteSettings {
  const base = { ...seedSettings, ...settings };
  const contacts = Array.isArray(base.contacts) && base.contacts.length > 0
    ? base.contacts
    : [
        { id: "email", label: "email", value: base.email || "" },
        { id: "location", label: "base", value: base.location || "" },
      ].filter((item) => item.value);

  return { ...base, contacts };
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
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

function readSettingsFile(): SiteSettings {
  return normalizeSettings(readJson<SiteSettings>(SETTINGS_FILE, seedSettings));
}

function writeSettingsFile(settings: SiteSettings) {
  writeJson(SETTINGS_FILE, normalizeSettings(settings));
}

function readProjectsFile(): Project[] {
  return readJson<Project[]>(PROJECTS_FILE, seedProjects).map(normalizeProject);
}

function writeProjectsFile(projects: Project[]) {
  writeJson(PROJECTS_FILE, projects.map(normalizeProject));
}

function readFeaturesFile(): FeatureItem[] {
  return readJson<FeatureItem[]>(FEATURES_FILE, seedFeatures).map(normalizeFeature);
}

function writeFeaturesFile(items: FeatureItem[]) {
  writeJson(FEATURES_FILE, items.map(normalizeFeature));
}

async function ensureSchema(sql: SqlClient) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql(`
        CREATE TABLE IF NOT EXISTS portfolio_settings (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      await sql(`
        CREATE TABLE IF NOT EXISTS portfolio_projects (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          visible BOOLEAN NOT NULL DEFAULT TRUE,
          order_index INTEGER NOT NULL DEFAULT 0,
          data JSONB NOT NULL
        )
      `);
      await sql(`
        CREATE TABLE IF NOT EXISTS portfolio_features (
          id TEXT PRIMARY KEY,
          order_index INTEGER NOT NULL DEFAULT 0,
          data JSONB NOT NULL
        )
      `);

      const settingsRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_settings") as Array<{ count: string }>;
      if (Number(settingsRows[0]?.count || 0) === 0) {
        await sql(
          "INSERT INTO portfolio_settings (id, data) VALUES ($1, $2::jsonb)",
          ["default", JSON.stringify(readSettingsFile())],
        );
      }

      const projectRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_projects") as Array<{ count: string }>;
      if (Number(projectRows[0]?.count || 0) === 0) {
        for (const project of readProjectsFile()) {
          await sql(
            "INSERT INTO portfolio_projects (id, slug, visible, order_index, data) VALUES ($1, $2, $3, $4, $5::jsonb)",
            [project.id, project.slug, project.visible, project.order, JSON.stringify(project)],
          );
        }
      }

      const featureRows = await sql("SELECT COUNT(*)::text AS count FROM portfolio_features") as Array<{ count: string }>;
      if (Number(featureRows[0]?.count || 0) === 0) {
        for (const feature of readFeaturesFile()) {
          await sql(
            "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb)",
            [feature.id, feature.order, JSON.stringify(feature)],
          );
        }
      }
    })();
  }

  await schemaReady;
}

async function db() {
  const sql = getSql();
  if (!sql) return null;
  await ensureSchema(sql);
  return sql;
}

// ---- Feature Items ----
export async function getFeatures(): Promise<FeatureItem[]> {
  const sql = await db();
  if (!sql) return readFeaturesFile().sort((a, b) => a.order - b.order);

  const rows = await sql("SELECT data FROM portfolio_features ORDER BY order_index ASC") as Array<{ data: FeatureItem }>;
  return rows.map((row) => normalizeFeature(row.data));
}

export async function addFeature(data: Omit<FeatureItem, "id">): Promise<FeatureItem> {
  const item = normalizeFeature({ ...data, id: generateId() });
  const sql = await db();
  if (!sql) {
    const items = readFeaturesFile();
    items.push(item);
    writeFeaturesFile(items);
    return item;
  }

  await sql(
    "INSERT INTO portfolio_features (id, order_index, data) VALUES ($1, $2, $3::jsonb)",
    [item.id, item.order, JSON.stringify(item)],
  );
  return item;
}

export async function updateFeature(id: string, data: Partial<FeatureItem>): Promise<FeatureItem | null> {
  const items = await getFeatures();
  const idx = items.findIndex((feature) => feature.id === id);
  if (idx === -1) return null;
  const updated = normalizeFeature({ ...items[idx], ...data });

  const sql = await db();
  if (!sql) {
    items[idx] = updated;
    writeFeaturesFile(items);
    return updated;
  }

  await sql(
    "UPDATE portfolio_features SET order_index = $1, data = $2::jsonb WHERE id = $3",
    [updated.order, JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteFeature(id: string): Promise<boolean> {
  const sql = await db();
  if (!sql) {
    const items = readFeaturesFile();
    const idx = items.findIndex((feature) => feature.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    writeFeaturesFile(items);
    return true;
  }

  const rows = await sql("DELETE FROM portfolio_features WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  return rows.length > 0;
}

export async function reorderFeatures(ids: string[]): Promise<FeatureItem[]> {
  const items = await getFeatures();
  const reordered = ids
    .map((id, order) => {
      const item = items.find((feature) => feature.id === id);
      return item ? normalizeFeature({ ...item, order }) : null;
    })
    .filter((item): item is FeatureItem => Boolean(item));

  const sql = await db();
  if (!sql) {
    writeFeaturesFile(reordered);
    return reordered;
  }

  for (const item of reordered) {
    await sql(
      "UPDATE portfolio_features SET order_index = $1, data = $2::jsonb WHERE id = $3",
      [item.order, JSON.stringify(item), item.id],
    );
  }
  return reordered;
}

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  return (await getAllProjects()).filter((project) => project.visible);
}

export async function getAllProjects(): Promise<Project[]> {
  const sql = await db();
  if (!sql) return readProjectsFile().sort((a, b) => a.order - b.order);

  const rows = await sql("SELECT data FROM portfolio_projects ORDER BY order_index ASC") as Array<{ data: Project }>;
  return rows.map((row) => normalizeProject(row.data));
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const sql = await db();
  if (!sql) return readProjectsFile().find((project) => project.slug === slug) || null;

  const rows = await sql("SELECT data FROM portfolio_projects WHERE slug = $1 LIMIT 1", [slug]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const sql = await db();
  if (!sql) return readProjectsFile().find((project) => project.id === id) || null;

  const rows = await sql("SELECT data FROM portfolio_projects WHERE id = $1 LIMIT 1", [id]) as Array<{ data: Project }>;
  return rows[0] ? normalizeProject(rows[0].data) : null;
}

export async function createProject(data: ProjectCreateInput): Promise<Project> {
  const project = normalizeProject({
    ...data,
    id: generateId(),
    rows: (data.rows || []).map((row) => ({ ...row, id: generateId(), images: [] })),
  });

  const sql = await db();
  if (!sql) {
    const projects = readProjectsFile();
    projects.push(project);
    writeProjectsFile(projects);
    return project;
  }

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
  if (!sql) {
    const projects = readProjectsFile();
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return null;
    projects[index] = updated;
    writeProjectsFile(projects);
    return updated;
  }

  await sql(
    "UPDATE portfolio_projects SET slug = $1, visible = $2, order_index = $3, data = $4::jsonb WHERE id = $5",
    [updated.slug, updated.visible, updated.order, JSON.stringify(updated), id],
  );
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const sql = await db();
  if (!sql) {
    const projects = readProjectsFile();
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) return false;
    projects.splice(index, 1);
    writeProjectsFile(projects);
    return true;
  }

  const rows = await sql("DELETE FROM portfolio_projects WHERE id = $1 RETURNING id", [id]) as Array<{ id: string }>;
  return rows.length > 0;
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

// ---- Settings ----
export async function getSettings(): Promise<SiteSettings> {
  const sql = await db();
  if (!sql) return readSettingsFile();

  const rows = await sql("SELECT data FROM portfolio_settings WHERE id = 'default' LIMIT 1") as Array<{ data: SiteSettings }>;
  return rows[0] ? normalizeSettings(rows[0].data) : normalizeSettings(seedSettings);
}

export async function updateSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  const updated = normalizeSettings({ ...(await getSettings()), ...data });
  const sql = await db();
  if (!sql) {
    writeSettingsFile(updated);
    return updated;
  }

  await sql(
    "INSERT INTO portfolio_settings (id, data) VALUES ('default', $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
    [JSON.stringify(updated)],
  );
  return updated;
}
