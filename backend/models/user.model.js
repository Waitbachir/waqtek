// user.model.js
import supabase from '../services/supabase.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

class User {

    // 🔹 Hash du mot de passe
    static async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    // 🔹 Vérification mot de passe
    static async checkPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // 🔹 JWT
    static generateJWT(user) {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "2h" }
        );
    }

    // 🔹 Création utilisateur
    static async create(userData) {
        userData.password_hash = await this.hashPassword(userData.password);
        delete userData.password;
        
        // Ensure full_name exists (required by schema)
        if (!userData.full_name) {
            userData.full_name = userData.email.split('@')[0];
        }

        const inserted = await supabase.createUser(userData);
        return inserted;
    }

    // 🔹 Chercher par email
    static async findByEmail(email) {
        return await supabase.getUserByEmail(email);
    }

    static async findById(id) {
        return await supabase.findById("users", id);
    }

    static async getAll() {
        return await supabase.findAll("users");
    }

    static async updateById(id, data) {
        return await supabase.update("users", id, data);
    }

    static async deleteById(id) {
        return await supabase.delete("users", id);
    }
}

export default User;

