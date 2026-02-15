import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { getPermissionsForRole, normalizeRole } from "../core/rbac.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.id;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const normalizedRole = normalizeRole(user.role);
    req.auth = decoded;
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      normalizedRole,
      full_name: user.full_name || null,
      id_etab: user.id_etab ?? null,
      establishment_id: user.establishment_id ?? user.establishmentid ?? user.id_etab ?? null
    };
    req.permissions = getPermissionsForRole(normalizedRole);
    req.userRaw = user;

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
