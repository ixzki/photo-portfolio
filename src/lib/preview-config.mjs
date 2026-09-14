export function databaseUrl(env = process.env) {
  return env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || "";
}

// Demo data is opt-in and never substitutes for a configured/broken database.
export function isDemoPreview(env = process.env) {
  return env.PREVIEW_DEMO === "true" && !env.VERCEL && !databaseUrl(env);
}

export function isReadOnlyPreview(env = process.env) {
  return env.PREVIEW_READ_ONLY === "true" || isDemoPreview(env);
}

export function isPreviewWriteBlocked(pathname, method, env = process.env) {
  return pathname.startsWith("/api/") && pathname !== "/api/auth" &&
    !["GET", "HEAD", "OPTIONS"].includes(method) && isReadOnlyPreview(env);
}
