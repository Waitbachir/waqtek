import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const exactFiles = new Set([
  "test-frontend.html",
  "test-signup.html",
  "waqtek_codex_prompts.txt",
  "enterprise/TEMPLATE.html",
]);

let removed = 0;

async function pruneEntry(absolutePath, relativePath) {
  const info = await stat(absolutePath);

  if (info.isDirectory()) {
    const entries = await readdir(absolutePath);
    await Promise.all(
      entries.map((entry) =>
        pruneEntry(path.join(absolutePath, entry), path.posix.join(relativePath, entry)),
      ),
    );
    return;
  }

  const rel = relativePath.replace(/\\/g, "/");
  const shouldRemove = rel.endsWith(".backup") || exactFiles.has(rel);

  if (!shouldRemove) return;

  await rm(absolutePath, { force: true });
  removed += 1;
}

try {
  await pruneEntry(distDir, "");
} catch (_) {
  // Dist may not exist if build failed upstream.
}

console.log(`Dist pruning complete: ${removed} file(s) removed.`);
