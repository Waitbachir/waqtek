import express from "express";
import PushController from "../controllers/push.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Enregistrement d'un client pour notifications (Web / Mobile)
router.post('/register', requireAuth, PushController.registerClient);

// Envoi d'une notification test à un client
router.post('/test', requireAuth, PushController.sendTestNotification);

// Notification automatique pour un ticket
router.post('/ticket', requireAuth, PushController.notifyTicket);

export default router;

