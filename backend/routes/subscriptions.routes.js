import express from "express";
import SubscriptionsController from "../controllers/subscriptions.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Subscriptions routes
router.get('/', requireAuth, SubscriptionsController.getSubscriptions);
router.post('/', requireAuth, SubscriptionsController.createSubscription);
router.put('/:id', requireAuth, SubscriptionsController.updateSubscription);
router.delete('/:id', requireAuth, SubscriptionsController.deleteSubscription);

export default router;
