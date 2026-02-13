import express from "express";
import EstablishmentsController from "../controllers/establishments.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateTenant } from "../middlewares/validateTenant.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";
import { cacheResponse } from "../middlewares/cache.middleware.js";
import { establishmentsListCacheKey } from "../core/cache.keys.js";

const router = express.Router();
const heavyCacheTtl = Number(process.env.CACHE_TTL_HEAVY_SEC || 120);

router.get('/public/list', EstablishmentsController.getAllPublic);

router.use(requireAuth, validateTenant);

router.post('/', validateRequest(schemas.establishmentCreate), EstablishmentsController.create);
router.get('/', cacheResponse({ ttlSeconds: heavyCacheTtl, keyBuilder: establishmentsListCacheKey }), EstablishmentsController.getAll);
router.get('/:id', EstablishmentsController.getById);
router.put('/:id', validateRequest(schemas.establishmentUpdate), EstablishmentsController.update);
router.delete('/:id', EstablishmentsController.delete);

export default router;
