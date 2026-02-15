import express from "express";
import SubscriptionsController from "../controllers/subscriptions.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permissions.middleware.js";

const router = express.Router();

// Subscriptions routes
router.get('/', requireAuth, requirePermission('subscriptions:read'), SubscriptionsController.getSubscriptions);
router.post('/', requireAuth, requirePermission('subscriptions:write'), SubscriptionsController.createSubscription);
router.put('/:id', requireAuth, requirePermission('subscriptions:write'), SubscriptionsController.updateSubscription);
router.delete('/:id', requireAuth, requirePermission('subscriptions:delete', 'subscriptions:write'), SubscriptionsController.deleteSubscription);

export default router;
