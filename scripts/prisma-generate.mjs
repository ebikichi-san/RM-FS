import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientEntry = join(root, "src", "generated", "prisma", "index.js");
const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

if (result.status === 0) {
  process.exit(0);
}

if (existsSync(clientEntry)) {
  console.warn("prisma generate could not replace a locked engine file; using the existing client.");
  process.exit(0);
}

process.exit(result.status ?? 1);
