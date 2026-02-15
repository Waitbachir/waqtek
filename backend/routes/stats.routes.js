import express from "express";
import StatsController from "../controllers/stats.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validateTenant } from "../middlewares/validateTenant.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";
import { cacheResponse } from '../middlewares/cache.middleware.js';
import { requirePermission } from "../middlewares/permissions.middleware.js";
import {
    dailyStatsCacheKey,
    monthlyStatsCacheKey,
    vipStatsCacheKey,
    queueStatsCacheKey,
    establishmentStatsCacheKey,
    dashboardStatsCacheKey
} from '../core/cache.keys.js';

const router = express.Router();
const statsCacheTtl = Number(process.env.CACHE_TTL_STATS_SEC || 300);

router.use(requireAuth, validateTenant, requirePermission('stats:read'));

router.get(
    '/revenue/daily',
    validateRequest(schemas.statsRangeQuery),
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: dailyStatsCacheKey }),
    StatsController.getRevenueDaily.bind(StatsController)
);
router.get(
    '/revenue/monthly',
    validateRequest(schemas.statsRangeQuery),
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: monthlyStatsCacheKey }),
    StatsController.getRevenueMonthly.bind(StatsController)
);
router.get(
    '/vip/count',
    validateRequest(schemas.statsRangeQuery),
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: vipStatsCacheKey }),
    StatsController.getVipCount.bind(StatsController)
);

router.get(
    '/queue/:queueId',
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: queueStatsCacheKey }),
    StatsController.getQueueStats.bind(StatsController)
);
router.get(
    '/establishment/:estId',
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: establishmentStatsCacheKey }),
    StatsController.getEstablishmentStats.bind(StatsController)
);
router.get(
    '/dashboard',
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: dashboardStatsCacheKey }),
    StatsController.getAllStats.bind(StatsController)
);
router.get(
    '/all',
    cacheResponse({ ttlSeconds: statsCacheTtl, keyBuilder: dashboardStatsCacheKey }),
    StatsController.getAllStats.bind(StatsController)
);

export default router;
