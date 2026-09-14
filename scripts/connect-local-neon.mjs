// One-shot, loopback-only credential handoff from the signed-in Neon console.
// Never prints or returns the connection string. No runtime/deployment dependency.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const token = randomBytes(24).toString("hex");
const expectedHost = process.argv[2];
if (!expectedHost || !expectedHost.endsWith(".neon.tech")) throw new Error("Expected Neon development endpoint required");
const route = `/connect/${token}`;
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  if (req.headers.host !== "127.0.0.1:3101" || req.url !== route) {res.writeHead(404).end(); return;}
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><html lang="zh"><title>本地 Neon 配置</title><body><h1>连接独立 Neon 开发分支</h1><p>仅保存到本机 .env.local，不显示或上传连接串。</p><form method="post"><label>开发分支连接串<input name="url" type="password" autocomplete="off" required style="width:600px"></label><button>保存本地连接</button></form></body></html>'); return;
  }
  if (req.method !== "POST" || req.headers.origin !== "http://127.0.0.1:3101") {res.writeHead(403).end(); return;}
  let body = "";
  for await (const chunk of req) {body += chunk; if (body.length > 8192) {res.writeHead(413).end(); return;}}
  try {
    const value = new URLSearchParams(body).get("url")?.trim();
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== expectedHost || !url.password || url.password.includes("*")) throw new Error("Invalid endpoint");
    const filename = new URL("../.env.local", import.meta.url);
    let env = readFileSync(filename, "utf8");
    env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${value}`).replace(/^PREVIEW_DEMO=.*$/m, "PREVIEW_DEMO=false").replace(/^PREVIEW_READ_ONLY=.*$/m, "PREVIEW_READ_ONLY=false");
    writeFileSync(filename, env);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><html lang="zh"><title>连接已保存</title><h1>已保存独立开发分支连接</h1><p>本地可编辑，下一步检查数据库并启动预览。</p></html>');
    console.log("Development branch credentials saved locally; values hidden.");
    server.close();
  } catch {res.writeHead(400).end("Invalid development branch connection; nothing changed.");}
});
server.listen(3101, "127.0.0.1", () => console.log(`http://127.0.0.1:3101${route}`));
setTimeout(() => server.close(), 10 * 60 * 1000).unref();
