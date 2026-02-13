import logger from '../core/logger.js';
// auth.controller.js

import User from '../models/user.model.js';
import jwt from 'jsonwebtoken.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

class AuthController {

    // 🔹 REGISTER
    static async register(req, res) {
        try {
            const { full_name, email, password, role } = req.body;

            if (!full_name || !email || !password) {
                return res.status(400).json({ message: "Champs manquants" });
            }

            const exists = await User.findByEmail(email);
            if (exists) {
                return res.status(400).json({ message: "Email déjà utilisé" });
            }

            const newUser = await User.create({
                full_name,
                email,
                password,
                role
            });

            return res.status(201).json({
                message: "Utilisateur créé",
                user: newUser
            });

        } catch (err) {
            logger.error("REGISTER ERROR:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
    }

    // 🔹 LOGIN
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email et mot de passe requis" });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).json({ message: "Utilisateur non trouvé" });
            }

            const valid = await User.checkPassword(password, user.password_hash);
            if (!valid) {
                return res.status(401).json({ message: "Mot de passe incorrect" });
            }

            const token = User.generateJWT(user);

            return res.status(200).json({
                message: "Connexion OK",
                token,
                user
            });

        } catch (err) {
            logger.error("LOGIN ERROR:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
    }

    // 🔹 Vérification JWT
    static verifyToken(req, res, next) {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Token manquant" });

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: "Token invalide" });
            req.user = decoded;
            next();
        });
    }
}

export default AuthController;

