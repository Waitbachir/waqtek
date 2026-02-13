import express from "express";
import { login, register } from "../services/auth.service.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { schemas } from "../core/validation.schemas.js";

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

export default router;
