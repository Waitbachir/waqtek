import express from "express";
import TicketsController from "../controllers/tickets.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateTenant } from "../middlewares/validateTenant.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";
import { cacheResponse } from "../middlewares/cache.middleware.js";
import {
  ticketsListCacheKey,
  ticketsByQueueCacheKey,
  ticketByIdCacheKey
} from "../core/cache.keys.js";

const router = express.Router();
const ticketsCacheTtl = Number(process.env.CACHE_TTL_TICKETS_SEC || 60);

router.post('/public/create', validateRequest(schemas.ticketCreate), TicketsController.create);
router.post('/public/pos-create', validateRequest(schemas.ticketPosCreate), TicketsController.createPosPublic);
router.get('/public/payment-status/:ticketId', TicketsController.getPublicPaymentStatus);
router.post('/public/remote-access/activate', TicketsController.activateRemoteAccess);
router.post('/public/remote-access/claim', TicketsController.claimRemoteAccess);
router.get('/public/remote-access/position', TicketsController.getRemoteAccessPosition);
router.get('/public/position/:ticketId', TicketsController.getPublicPosition);

router.use(requireAuth, validateTenant);

router.post('/', validateRequest(schemas.ticketCreate), TicketsController.create);
router.get('/', cacheResponse({ ttlSeconds: ticketsCacheTtl, keyBuilder: ticketsListCacheKey }), TicketsController.getAll);
router.get('/queue/:queueId', cacheResponse({ ttlSeconds: ticketsCacheTtl, keyBuilder: ticketsByQueueCacheKey }), TicketsController.getByQueue);
router.get('/:id', cacheResponse({ ttlSeconds: ticketsCacheTtl, keyBuilder: ticketByIdCacheKey }), TicketsController.getById);
router.put('/:id/status', validateRequest(schemas.ticketStatusUpdate), TicketsController.updateStatus);
router.delete('/:id', TicketsController.delete);

export default router;
