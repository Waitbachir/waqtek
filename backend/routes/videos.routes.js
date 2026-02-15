import express from 'express';
import VideosController from '../controllers/videos.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateTenant } from '../middlewares/validateTenant.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { schemas } from '../core/validation.schemas.js';
import { cacheResponse } from '../middlewares/cache.middleware.js';
import { requirePermission } from '../middlewares/permissions.middleware.js';
import { videosByEstablishmentCacheKey, videoByIdCacheKey } from '../core/cache.keys.js';

const router = express.Router();
const heavyCacheTtl = Number(process.env.CACHE_TTL_HEAVY_SEC || 120);

router.use(requireAuth, validateTenant);

router.get(
    '/establishment/:establishmentId',
    requirePermission('videos:read'),
    cacheResponse({ ttlSeconds: heavyCacheTtl, keyBuilder: videosByEstablishmentCacheKey }),
    VideosController.getByEstablishment
);
router.get('/:id', requirePermission('videos:read'), cacheResponse({ ttlSeconds: heavyCacheTtl, keyBuilder: videoByIdCacheKey }), VideosController.getById);
router.post('/', requirePermission('videos:write'), validateRequest(schemas.videoCreate), VideosController.create);

export default router;
