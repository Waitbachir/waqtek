/**
 * EstablishmentService.js - Service de gestion des établissements
 * Remplace les fonctions d'établissements dans enterprise.js
 */

class EstablishmentService {
    /**
     * Obtenir tous les établissements
     */
    static async getEstablishments() {
        try {
            stateManager.setLoading(true);

            const response = await apiClient.getEstablishments();

            const establishments = response.establishments || response;
            const list = Array.isArray(establishments) ? establishments : [];

            console.log(`✅ ${list.length} établissements chargés`);
            return list;

        } catch (error) {
            console.error('❌ Erreur chargement établissements:', error);
            stateManager.setError(error.message || 'Chargement échoué');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir un établissement spécifique
     */
    static async getEstablishment(id) {
        try {
            const response = await apiClient.getEstablishment(id);
            return response.establishment || response;

        } catch (error) {
            console.error('❌ Erreur chargement établissement:', error);
            throw error;
        }
    }

    /**
     * Créer un établissement
     */
    static async createEstablishment(name, address, data = {}) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            if (!name || !address) {
                throw new Error('Nom et adresse sont obligatoires');
            }

            const response = await apiClient.createEstablishment({
                name,
                address,
                ...data
            });

            console.log('✅ Établissement créé:', name);
            showToast('Établissement créé avec succès', 'success');

            return response.establishment || response;

        } catch (error) {
            console.error('❌ Erreur création établissement:', error);
            stateManager.setError(error.message || 'Création échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Mettre à jour un établissement
     */
    static async updateEstablishment(id, data) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const response = await apiClient.updateEstablishment(id, data);

            console.log('✅ Établissement mis à jour:', id);
            showToast('Établissement mis à jour', 'success');

            return response.establishment || response;

        } catch (error) {
            console.error('❌ Erreur mise à jour établissement:', error);
            stateManager.setError(error.message || 'Mise à jour échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Supprimer un établissement
     */
    static async deleteEstablishment(id) {
        try {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cet établissement?')) {
                return false;
            }

            stateManager.setLoading(true);
            stateManager.setError(null);

            await apiClient.deleteEstablishment(id);

            console.log('✅ Établissement supprimé:', id);
            showToast('Établissement supprimé', 'success');

            return true;

        } catch (error) {
            console.error('❌ Erreur suppression établissement:', error);
            stateManager.setError(error.message || 'Suppression échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Charger les options select d'établissements
     */
    static async loadEstablishmentsSelect(selectId) {
        try {
            const select = document.getElementById(selectId);
            if (!select) {
                console.warn(`⚠️ Select #${selectId} non trouvé`);
                return;
            }

            const establishments = await this.getEstablishments();

            select.innerHTML = '<option value="">Sélectionner un établissement</option>';

            establishments.forEach(est => {
                const option = document.createElement('option');
                option.value = est.id;
                option.textContent = est.name;
                select.appendChild(option);
            });

            console.log(`✅ Select #${selectId} chargé`);

        } catch (error) {
            console.error('❌ Erreur chargement select:', error);
        }
    }

    /**
     * Obtenir l'établissement actuel
     */
    static getCurrentEstablishment() {
        return stateManager.getCurrentEstablishment();
    }

    /**
     * Définir l'établissement actuel
     */
    static setCurrentEstablishment(establishment) {
        stateManager.setCurrentEstablishment(establishment);
    }

    /**
     * Filtrer les établissements liés à l'utilisateur connecté
     */
    static filterByCurrentUser(establishments = []) {
        const list = Array.isArray(establishments) ? establishments : [];
        const user = stateManager.getUser() || this.getUserFromStorage();

        if (!user || (!user.id && !user.email)) {
            return list;
        }

        const userId = user.id || user.user_id || user.userId || null;
        const userEmail = (user.email || '').toLowerCase();

        return list.filter((est) => {
            const managerId = est.manager_id || est.managerId || est.managerID || null;
            const managerEmail = (est.manager_email || est.managerEmail || est.owner_email || est.email || '').toLowerCase();

            if (userId && managerId && managerId === userId) {
                return true;
            }

            if (userEmail && managerEmail && managerEmail === userEmail) {
                return true;
            }

            return false;
        });
    }

    static getUserFromStorage() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }
}

// Expose globalement
window.EstablishmentService = EstablishmentService;
