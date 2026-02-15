import express from "express";
import AdminController from "../controllers/admin.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { requirePermission } from "../middlewares/permissions.middleware.js";

const router = express.Router();

// Admin routes here
router.get(
  '/users',
  requireAuth,
  requireRole('ADMIN'),
  requirePermission('admin:users:read'),
  AdminController.getUsers
);
router.post(
  '/users/:id/role',
  requireAuth,
  requireRole('ADMIN'),
  requirePermission('admin:users:role:update'),
  AdminController.updateUserRole
);

export default router;
