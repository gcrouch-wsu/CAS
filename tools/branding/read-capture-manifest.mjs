import fs from "node:fs";
import path from "node:path";
import { get } from "@vercel/blob";

const REPO_ROOT = process.cwd();
const MANIFEST_PATH = "cas-branding-capture/current.json";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(path.join(REPO_ROOT, ".env.local"));
loadEnvFile(path.join(REPO_ROOT, ".env.branding"));

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set.");
  process.exit(1);
}

const access = process.env.CAS_BLOB_ACCESS === "public" ? "public" : "private";
const result = await get(MANIFEST_PATH, {
  access,
  token,
  useCache: false,
});

if (!result?.stream) {
  console.error(`Capture manifest not found at ${MANIFEST_PATH}. Save the Vercel admin publication first.`);
  process.exit(1);
}

const text = await new Response(result.stream).text();
JSON.parse(text);
process.stdout.write(text);
