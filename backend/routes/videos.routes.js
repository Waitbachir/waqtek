import express from 'express';
import VideosController from '../controllers/videos.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateTenant } from '../middlewares/validateTenant.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { schemas } from '../core/validation.schemas.js';
import { cacheResponse } from '../middlewares/cache.middleware.js';
import { videosByEstablishmentCacheKey, videoByIdCacheKey } from '../core/cache.keys.js';

const router = express.Router();
const heavyCacheTtl = Number(process.env.CACHE_TTL_HEAVY_SEC || 120);

router.use(requireAuth, validateTenant);

router.get(
    '/establishment/:establishmentId',
    cacheResponse({ ttlSeconds: heavyCacheTtl, keyBuilder: videosByEstablishmentCacheKey }),
    VideosController.getByEstablishment
);
router.get('/:id', cacheResponse({ ttlSeconds: heavyCacheTtl, keyBuilder: videoByIdCacheKey }), VideosController.getById);
router.post('/', validateRequest(schemas.videoCreate), VideosController.create);

export default router;
