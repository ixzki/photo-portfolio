import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const expected = "ep-young-haze-aomwps7p-pooler.c-2.ap-southeast-1.aws.neon.tech";
assert.equal(new URL(process.env.DATABASE_URL).hostname, expected, "此验证仅允许已创建的 local-preview 分支");
const base = "http://127.0.0.1:3100";
const evidence = [];
const login = await fetch(`${base}/api/auth`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "login", password: process.env.ADMIN_PASSWORD }),
});
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const headers = { Cookie: cookie, "Content-Type": "application/json" };
let temporaryMediaId;
try {
  for (const route of ["/", "/works", "/about", "/setup", "/admin", "/admin/projects", "/admin/features", "/admin/media", "/admin/settings", "/api/health/db"]) {
    const response = await fetch(base + route, { headers });
    const body = await response.text();
    assert.equal(response.status, 200, route);
    assert.ok(!body.includes("NEXT_HTTP_ERROR_FALLBACK;500"), route);
    if (route === "/api/health/db") assert.equal(JSON.parse(body).ok, true);
    evidence.push({ route, status: response.status });
  }
  assert.equal((await fetch(`${base}/api/projects`)).status, 401);
  const projects = await (await fetch(`${base}/api/projects`, { headers })).json();
  assert.ok(projects.length > 0);
  const imageHosts = new Set();
  for (const project of projects) {
    for (const value of [project.coverUrl, project.thumbUrl, project.featureUrl, ...project.rows.flatMap(row => row.images.map(image => image.url))]) {
      if (value) imageHosts.add(new URL(value).hostname);
    }
    const route = `/works/${project.slug}`;
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    evidence.push({ route, status: response.status });
  }
  const image = await fetch(projects[0].coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15000) });
  assert.ok(image.ok, "图床封面 HEAD 检查");
  evidence.push({ check: "remote-image", status: image.status, contentType: image.headers.get("content-type"), hosts: [...imageHosts] });
  const initialMedia = await (await fetch(`${base}/api/media`, { headers })).json();
  const createdResponse = await fetch(`${base}/api/media`, { method: "POST", headers, body: JSON.stringify({ url: projects[0].coverUrl, title: "本地预览临时验证", alt: "preview-smoke", width: projects[0].coverW, height: projects[0].coverH }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  temporaryMediaId = created.id;
  const update = await fetch(`${base}/api/media?id=${encodeURIComponent(created.id)}`, { method: "PUT", headers, body: JSON.stringify({ ...created, title: "本地预览保存验证完成" }) });
  assert.equal(update.status, 200);
  const after = await (await fetch(`${base}/api/media`, { headers })).json();
  assert.equal(after.find(item => item.id === created.id).title, "本地预览保存验证完成");
  const removed = await fetch(`${base}/api/media?id=${encodeURIComponent(created.id)}`, { method: "DELETE", headers });
  assert.equal(removed.status, 200);
  temporaryMediaId = undefined;
  const finalMedia = await (await fetch(`${base}/api/media`, { headers })).json();
  assert.equal(finalMedia.length, initialMedia.length);
  evidence.push({ check: "development-branch-media-crud", create: 201, update: 200, readVerified: true, delete: 200, restoredCount: finalMedia.length });
  writeFileSync(".local-preview/verification.json", JSON.stringify({ checkedAt: new Date().toISOString(), branch: "local-preview", evidence }, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (temporaryMediaId) await fetch(`${base}/api/media?id=${encodeURIComponent(temporaryMediaId)}`, { method: "DELETE", headers });
  await fetch(`${base}/api/auth`, { method: "POST", headers, body: JSON.stringify({ action: "logout" }) });
}
