import express from "express";
import { getAuthProfileByUserId, login, register } from "../services/auth.service.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permissions.middleware.js";

const router = express.Router();

router.post('/register', validateRequest(schemas.authRegister), async (req, res) => {
  try {
    const result = await register(req.body.email, req.body.password, req.body.role);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', validateRequest(schemas.authLogin), async (req, res) => {
  try {
    const result = await login(req.body.email, req.body.password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

router.get('/me', requireAuth, requirePermission('auth:me:read'), async (req, res) => {
  try {
    const profile = await getAuthProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json(profile);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal error' });
  }
});

export default router;
