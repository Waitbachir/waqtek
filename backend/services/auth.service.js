import User from "../models/user.model.js";

export async function register(email, password, role = "client") {
  // Delegate creation to the User model which handles hashing and uses the
  // unified Supabase service (password_hash column).
  const created = await User.create({ email, password, role });
  // User.create returns the inserted user record (including id and role)
  return {
    token: User.generateJWT(created)
  };
}

export async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user) throw new Error("User not found");

  const valid = await User.checkPassword(password, user.password_hash || user.password);
  if (!valid) throw new Error("Invalid credentials");

  return {
    token: User.generateJWT(user)
  };
}

