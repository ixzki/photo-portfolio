import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const command = process.argv[2] || "dev";
if (!["dev", "build", "start"].includes(command) || process.argv.length > 3) {
  console.error("用法：npm run demo -- [dev|build|start]");
  process.exit(1);
}

// Explicit empty values also prevent Next's .env files from supplying a database.
// This process has an isolated build directory and never edits local configuration.
const env = {
  ...process.env,
  DATABASE_URL: "", POSTGRES_URL: "", POSTGRES_PRISMA_URL: "",
  VERCEL: "", PREVIEW_DEMO: "true", PREVIEW_READ_ONLY: "true",
  NEXT_PUBLIC_UPYUN_HOSTS: "", IMAGE_REMOTE_HOSTS: "",
  NEXT_PUBLIC_TRAVEL_TILE_URL: "", LOCAL_PREVIEW_LABEL: "",
};
const child = spawn(process.execPath, [
  fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), command,
  ...(command === "build" ? [] : ["--hostname", "127.0.0.1", "--port", "3200"]),
], { cwd: fileURLToPath(new URL("..", import.meta.url)), env, stdio: "inherit", windowsHide: true });
child.on("error", () => { console.error("示例启动失败，请先执行 npm ci。"); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
