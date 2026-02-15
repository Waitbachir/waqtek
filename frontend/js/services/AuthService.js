/**
 * AuthService.js - Service d'authentification
 * Remplace la fonction login() dans enterprise.js
 */

class AuthService {
    static normalizeRole(role) {
        const raw = String(role || '').trim().toUpperCase();
        if (!raw) return 'PUBLIC';
        if (raw === 'ENTERPRISE') return 'MANAGER';
        return raw;
    }

    static async getMe() {
        const response = await apiClient.getAuthMe();
        if (response?.user) {
            stateManager.setUser(response.user);
        }
        return response;
    }

    /**
     * Connexion
     */
    static async login(email, password) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const response = await apiClient.login(email, password);

            if (!response.token) {
                throw new Error('Token non reçu');
            }

            // Sauvegarder le token
            stateManager.setToken(response.token);

            // Si user data fourni, le sauvegarder aussi
            if (response.user) {
                stateManager.setUser(response.user);
            }

            console.log('✅ Connexion réussie:', email);
            return response;

        } catch (error) {
            console.error('❌ Erreur login:', error);
            stateManager.setError(error.message || 'Connexion échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Déconnexion
     */
    static async logout() {
        try {
            stateManager.setLoading(true);

            // Essayer de notifier le serveur (optionnel)
            try {
                await apiClient.logout();
            } catch (error) {
                console.warn('⚠️ Logout API échoué:', error);
            }

            // Réinitialiser l'état
            stateManager.reset();
            
            // Déconnecter WebSocket
            if (wsClient.isConnected()) {
                wsClient.disconnect();
            }

            console.log('✅ Déconnexion réussie');
            return true;

        } catch (error) {
            console.error('❌ Erreur logout:', error);
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Enregistrement
     */
    static async register(email, password, role = 'manager', fullName = null) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            // Si email et password sont fournis directement (nouveau format)
            const userData = typeof email === 'string' ? {
                email,
                password,
                role,
                full_name: fullName
            } : email; // Si c'est un objet (ancien format)

            const response = await apiClient.register(userData);

            if (!response.token) {
                throw new Error('Token non reçu');
            }

            // Sauvegarder le token si fourni
            if (response.token) {
                stateManager.setToken(response.token);
            }

            console.log('✅ Enregistrement réussi');
            return response;

        } catch (error) {
            console.error('❌ Erreur register:', error);
            stateManager.setError(error.message || 'Enregistrement échoué');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    static async getCurrentUser() {
        try {
            const user = stateManager.getUser();
            
            if (!user) {
                throw new Error('Utilisateur non connecté');
            }

            // Essayer de rafraîchir depuis le serveur
            try {
                const response = await this.getMe();
                if (response.user) {
                    stateManager.setUser(response.user);
                    return response.user;
                }
            } catch (error) {
                console.warn('⚠️ Impossible de rafraîchir l\'utilisateur:', error);
                // Retourner l'utilisateur en cache
            }

            return user;

        } catch (error) {
            console.error('❌ Erreur getCurrentUser:', error);
            throw error;
        }
    }

    /**
     * Vérifier si authentifié
     */
    static isAuthenticated() {
        return stateManager.isAuthenticated();
    }

    /**
     * Obtenir le token
     */
    static getToken() {
        return stateManager.getToken();
    }

    /**
     * Vérifier le token et rediriger si nécessaire
     */
    static requireAuth(redirectTo = 'sign-in.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    /**
     * Mettre à jour le profil
     */
    static async updateProfile(profileData) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const response = await apiClient.updateProfile(profileData);

            if (response.user) {
                stateManager.setUser(response.user);
            }

            console.log('✅ Profil mis à jour');
            return response;

        } catch (error) {
            console.error('❌ Erreur updateProfile:', error);
            stateManager.setError(error.message || 'Mise à jour échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }
}

// Expose globalement
window.AuthService = AuthService;
