import express from "express";
import compression from "compression";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import securityMiddleware from "./middlewares/security.middleware.js";
import errorHandler, { notFoundHandler } from "./middlewares/error.middleware.js";
import { initMonitoring } from './core/monitoring.js';
import { monitorLongRequests, logApiExecutionTime } from './middlewares/monitoring.middleware.js';
import cacheService from './core/cache.service.js';
import apiRoutes from "./routes/index.js";
import logger from "./core/logger.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = existsSync(path.resolve(__dirname, "../dist"))
	? path.resolve(__dirname, "../dist")
	: path.resolve(__dirname, "../frontend");
const compressibleExtensions = new Set([
	".html",
	".css",
	".js",
	".mjs",
	".json",
	".svg",
	".txt",
	".xml",
	".map"
]);

// Monitoring and security bootstrap.
initMonitoring();
await cacheService.init();
securityMiddleware(app);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(monitorLongRequests);

app.use("/api", logApiExecutionTime, apiRoutes);
app.use(compression({
	threshold: 0,
	brotli: { enabled: true },
	filter: (req, res) => {
		const ext = path.extname(req.path || "");
		if (!compressibleExtensions.has(ext)) {
			return false;
		}

		return compression.filter(req, res);
	}
}));
app.use(express.static(staticRoot, {
	index: false,
	extensions: ["html"],
	maxAge: process.env.NODE_ENV === "production" ? "1d" : 0
}));

app.get("/api/debug", (_, res) => {
	res.json({
		routesLoaded: !!apiRoutes,
		message: "Check if API routes imported successfully"
	});
});

app.post("/api/save-console", async (req, res) => {
	try {
		const { text } = req.body;

		if (!text) {
			return res.status(400).json({
				success: false,
				message: "Aucun texte fourni"
			});
		}

		const [{ writeFile }, { default: path }] = await Promise.all([
			import("node:fs/promises"),
			import("node:path")
		]);

		const filePath = path.resolve(process.cwd(), "CONSOL.text");
		await writeFile(filePath, text, "utf8");

		res.json({
			success: true,
			message: "Texte sauvegarde avec succes dans CONSOL.text !",
			fileSize: text.length
		});
	} catch (error) {
		logger.error("Erreur lors de la sauvegarde", { error: error.message, stack: error.stack });
		res.status(500).json({
			success: false,
			message: "Erreur lors de la sauvegarde: " + error.message
		});
	}
});

app.get("/", (_, res) => res.json({ status: "WAQTEK API ONLINE" }));

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_, res) => {
	res.status(204).end();
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
