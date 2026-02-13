import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const distDir = path.join(rootDir, "dist");

const counters = {
  js: 0,
  css: 0,
  copied: 0,
};

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function minifyJs(inputPath, outputPath) {
  const source = await readFile(inputPath, "utf8");
  const result = await transform(source, {
    loader: "js",
    minify: true,
    target: "es2019",
  });

  await ensureDir(path.dirname(outputPath));
  await writeFile(outputPath, result.code, "utf8");
  counters.js += 1;
}

async function minifyCss(inputPath, outputPath) {
  const source = await readFile(inputPath, "utf8");
  const result = await transform(source, {
    loader: "css",
    minify: true,
    target: "es2019",
  });

  await ensureDir(path.dirname(outputPath));
  await writeFile(outputPath, result.code, "utf8");
  counters.css += 1;
}

async function copyAsset(inputPath, outputPath) {
  await ensureDir(path.dirname(outputPath));
  await copyFile(inputPath, outputPath);
  counters.copied += 1;
}

async function processEntry(srcPath, dstPath) {
  const info = await stat(srcPath);

  if (info.isDirectory()) {
    const entries = await readdir(srcPath);
    await Promise.all(
      entries.map((entry) =>
        processEntry(path.join(srcPath, entry), path.join(dstPath, entry)),
      ),
    );
    return;
  }

  if (srcPath.endsWith(".js")) {
    await minifyJs(srcPath, dstPath);
    return;
  }

  if (srcPath.endsWith(".css")) {
    await minifyCss(srcPath, dstPath);
    return;
  }

  await copyAsset(srcPath, dstPath);
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);

  await processEntry(frontendDir, distDir);

  console.log(
    `Frontend build complete: ${counters.js} JS minified, ${counters.css} CSS minified, ${counters.copied} files copied.`,
  );
}

main().catch((error) => {
  console.error("Frontend build failed:", error);
  process.exitCode = 1;
});
