import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env", ".env.local"]) {
  try {
    for (const line of readFileSync(join(root, name), "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i <= 0 || line.startsWith("#")) continue;
      const k = line.slice(0, i).trim();
      if (process.env[k]) continue;
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  } catch {
    // optional env file
  }
}

const url = process.env.DATABASE_URL ?? "";
const isSqlite = url.startsWith("file:");
const sqlFile = join(
  root,
  "supabase",
  "migrations",
  isSqlite
    ? "20260925120000_diagnosis_results.sqlite.sql"
    : "20260925120000_diagnosis_results.sql",
);

const sql = readFileSync(sqlFile, "utf8");
const withoutComments = sql
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = withoutComments
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const prisma = new PrismaClient();
try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  const tables = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('diagnosis_results','DiagnosisResult') ORDER BY name`,
  );
  console.log(`Applied ${sqlFile}`);
  console.log(`DATABASE_URL provider: ${isSqlite ? "sqlite" : "postgres"}`);
  console.log("Tables:", tables);
} finally {
  await prisma.$disconnect();
}
