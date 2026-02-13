import express from "express";
import AdminController from "../controllers/admin.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Admin routes here
router.get('/users', requireAuth, AdminController.getUsers);
router.post('/users/:id/role', requireAuth, AdminController.updateUserRole);

export default router;
