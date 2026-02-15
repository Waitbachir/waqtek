import User from "../models/user.model.js";
import { getPermissionsForRole, normalizeRole } from "../core/rbac.js";

export async function register(email, password, role = "client") {
  // Delegate creation to the User model which handles hashing and uses the
  // unified Supabase service (password_hash column).
  const created = await User.create({ email, password, role });
  const normalizedRole = normalizeRole(created.role);
  // User.create returns the inserted user record (including id and role)
  return {
    token: User.generateJWT(created),
    user: {
      id: created.id,
      email: created.email,
      role: created.role,
      normalizedRole,
      id_etab: created.id_etab ?? null,
      establishment_id: created.establishment_id ?? created.establishmentid ?? created.id_etab ?? null
    },
    permissions: getPermissionsForRole(normalizedRole)
  };
}

export async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user) throw new Error("User not found");

  const valid = await User.checkPassword(password, user.password_hash || user.password);
  if (!valid) throw new Error("Invalid credentials");
  const normalizedRole = normalizeRole(user.role);

  return {
    token: User.generateJWT(user),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      normalizedRole,
      id_etab: user.id_etab ?? null,
      establishment_id: user.establishment_id ?? user.establishmentid ?? user.id_etab ?? null
    },
    permissions: getPermissionsForRole(normalizedRole)
  };
}

export async function getAuthProfileByUserId(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const normalizedRole = normalizeRole(user.role);
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      normalizedRole,
      full_name: user.full_name || null,
      id_etab: user.id_etab ?? null,
      establishment_id: user.establishment_id ?? user.establishmentid ?? user.id_etab ?? null
    },
    permissions: getPermissionsForRole(normalizedRole)
  };
}

