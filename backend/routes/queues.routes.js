import express from "express";
import QueuesController from "../controllers/queues.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateTenant } from "../middlewares/validateTenant.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";
import Queue from '../models/queue.model.js';
import { cacheResponse } from '../middlewares/cache.middleware.js';
import { requirePermission } from "../middlewares/permissions.middleware.js";
import {
    activeQueuesCacheKey,
    queuesByEstablishmentCacheKey,
    publicQueuesByEstablishmentCacheKey
} from '../core/cache.keys.js';

const router = express.Router();
const queueHeavyCacheTtl = Number(process.env.CACHE_TTL_HEAVY_SEC || 120);
const queueActiveCacheTtl = Number(process.env.CACHE_TTL_QUEUES_ACTIVE_SEC || 300);

router.get(
    '/public/establishment/:estId',
    cacheResponse({ ttlSeconds: queueHeavyCacheTtl, keyBuilder: publicQueuesByEstablishmentCacheKey }),
    QueuesController.getByEstablishmentPublic
);
router.get('/:id/public', async (req, res) => {
    try {
        const queueId = req.params.id;
        const queue = await Queue.findById(queueId);
        if (!queue) return res.status(404).json({ error: 'Queue introuvable' });

        res.json({ id: queue.id, currentticketnumber: queue.currentticketnumber });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.use(requireAuth, validateTenant);

router.post('/', requirePermission('queues:write'), validateRequest(schemas.queueCreate), QueuesController.create);
router.get('/', requirePermission('queues:read'), QueuesController.getAll);
router.get(
    '/active',
    requirePermission('queues:read'),
    cacheResponse({ ttlSeconds: queueActiveCacheTtl, keyBuilder: activeQueuesCacheKey }),
    QueuesController.getActive
);
router.get(
    '/establishment/:estId',
    requirePermission('queues:read'),
    cacheResponse({ ttlSeconds: queueHeavyCacheTtl, keyBuilder: queuesByEstablishmentCacheKey }),
    QueuesController.getByEstablishment
);
router.get('/:id', requirePermission('queues:read'), QueuesController.getById);
router.put('/:id', requirePermission('queues:write'), QueuesController.update);
router.delete('/:id', requirePermission('queues:delete', 'queues:write'), QueuesController.delete);

export default router;
