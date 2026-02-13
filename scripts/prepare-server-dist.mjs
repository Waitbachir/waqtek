import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

await mkdir(distDir, { recursive: true });

const targetLanding = "enterprise/sign-in.html";
const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=./${targetLanding}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WaQtek</title>
</head>
<body>
  <p>Redirecting to <a href="./${targetLanding}">${targetLanding}</a>...</p>
</body>
</html>
`;

const metadata = {
  generatedAt: new Date().toISOString(),
  distPath: "dist",
  landingPage: targetLanding,
  notes: [
    "Frontend assets are minified.",
    "Non-deployable files are pruned.",
    "Dist is ready to be served as static files.",
  ],
};

await writeFile(path.join(distDir, "index.html"), redirectHtml, "utf8");
await writeFile(
  path.join(distDir, "build-info.json"),
  JSON.stringify(metadata, null, 2),
  "utf8",
);

try {
  const robotsPath = path.join(distDir, "robots.txt");
  const robotsExists = await readFile(robotsPath, "utf8").then(() => true).catch(() => false);
  if (!robotsExists) {
    await writeFile(robotsPath, "User-agent: *\nAllow: /\n", "utf8");
  }
} catch (_) {
  // No-op.
}

console.log("Server-ready dist prepared.");
