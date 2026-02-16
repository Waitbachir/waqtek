/**
 * QueueService.js - Service de gestion des queues
 * Remplace les fonctions de queues dans enterprise.js
 */

class QueueService {
    /**
     * Obtenir toutes les queues (avec token)
     */
    static async getQueues(params = {}) {
        try {
            stateManager.setLoading(true);

            const response = await apiClient.getQueues(params);

            let queues = [];
            if (Array.isArray(response)) {
                queues = response;
            } else if (response.queues) {
                queues = Array.isArray(response.queues) 
                    ? response.queues 
                    : response.queues.rows || [];
            }

            console.log(`✅ ${queues.length} queues chargées`);
            return queues;

        } catch (error) {
            console.error('❌ Erreur chargement queues:', error);
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir les queues d'un établissement
     */
    static async getQueuesByEstablishment(establishmentId) {
        try {
            stateManager.setLoading(true);

            const response = await apiClient.getQueuesByEstablishment(establishmentId);

            let queues = [];
            if (Array.isArray(response)) {
                queues = response;
            } else if (response.queues) {
                queues = Array.isArray(response.queues) 
                    ? response.queues 
                    : response.queues.rows || [];
            }

            console.log(`✅ ${queues.length} queues pour établissement ${establishmentId}`);
            return queues;

        } catch (error) {
            console.error('❌ Erreur chargement queues établissement:', error);
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir une queue spécifique
     */
    static async getQueue(queueId) {
        try {
            const response = await apiClient.getQueue(queueId);
            return response.queue || response;

        } catch (error) {
            console.error('❌ Erreur chargement queue:', error);
            throw error;
        }
    }

    static async getAvailableCounters(queueId) {
        try {
            const response = await apiClient.getQueueAvailableCounters(queueId);
            const counters = Array.isArray(response?.availableCounters) ? response.availableCounters : [];
            return counters;
        } catch (error) {
            console.error('❌ Erreur chargement guichets disponibles:', error);
            throw error;
        }
    }

    static async saveManagerContext(queueId, counter) {
        const response = await apiClient.saveManagerContext({ queueId, counter });
        return response?.context || null;
    }

    static async getManagerContext() {
        const response = await apiClient.getManagerContext();
        return response?.context || null;
    }

    /**
     * Obtenir les tickets en attente d'une queue
     */
    static async getWaitingTickets(queueId) {
        try {
            const response = await apiClient.getTicketsByQueue(queueId);

            const tickets = response.tickets || [];
            const waiting = tickets
                .filter(t => t.status === 'waiting')
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            return waiting;

        } catch (error) {
            console.error('❌ Erreur chargement tickets en attente:', error);
            throw error;
        }
    }

    /**
     * Créer une queue
     */
    static async createQueue(queueData) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            if (!queueData.name || !queueData.establishmentid) {
                throw new Error('Nom et établissement sont obligatoires');
            }

            const response = await apiClient.createQueue(queueData);

            console.log('✅ Queue créée:', queueData.name);
            showToast('Queue créée avec succès', 'success');

            return response.queue || response;

        } catch (error) {
            console.error('❌ Erreur création queue:', error);
            stateManager.setError(error.message || 'Création échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Mettre à jour une queue
     */
    static async updateQueue(queueId, queueData) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const response = await apiClient.updateQueue(queueId, queueData);

            console.log('✅ Queue mise à jour:', queueId);
            showToast('Queue mise à jour', 'success');

            return response.queue || response;

        } catch (error) {
            console.error('❌ Erreur mise à jour queue:', error);
            stateManager.setError(error.message || 'Mise à jour échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Supprimer une queue
     */
    static async deleteQueue(queueId) {
        try {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cette queue?')) {
                return false;
            }

            stateManager.setLoading(true);
            stateManager.setError(null);

            await apiClient.deleteQueue(queueId);

            console.log('✅ Queue supprimée:', queueId);
            showToast('Queue supprimée', 'success');

            return true;

        } catch (error) {
            console.error('❌ Erreur suppression queue:', error);
            stateManager.setError(error.message || 'Suppression échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Appeler le prochain ticket d'une queue
     */
    static async callNextTicket(queueId, counter = null) {
        try {
            const waiting = await this.getWaitingTickets(queueId);

            if (!waiting.length) {
                showToast('Aucun ticket en attente', 'info');
                return null;
            }

            const nextTicket = waiting[0];
            if (window.TicketService && typeof TicketService.updateTicketStatus === 'function') {
                await TicketService.updateTicketStatus(nextTicket.id, 'called', counter ? { counter } : {});
            } else {
                await apiClient.callTicket(nextTicket.id);
            }

            stateManager.setCurrentTicket(nextTicket);

            console.log('✅ Ticket appelé:', nextTicket.number);
            return nextTicket;

        } catch (error) {
            console.error('❌ Erreur appel ticket:', error);
            stateManager.setError(error.message || 'Appel échoué');
            throw error;
        }
    }

    /**
     * Marquer le ticket actuel comme servi
     */
    static async serveCurrentTicket() {
        try {
            const current = stateManager.getCurrentTicket();

            if (!current) {
                throw new Error('Aucun ticket en cours');
            }

            await apiClient.serveTicket(current.id);
            stateManager.setCurrentTicket(null);

            console.log('✅ Ticket servi');
            return true;

        } catch (error) {
            console.error('❌ Erreur service ticket:', error);
            stateManager.setError(error.message || 'Service échoué');
            throw error;
        }
    }

    /**
     * Marquer le ticket actuel comme raté
     */
    static async missCurrentTicket() {
        try {
            const current = stateManager.getCurrentTicket();

            if (!current) {
                throw new Error('Aucun ticket en cours');
            }

            await apiClient.missTicket(current.id);
            stateManager.setCurrentTicket(null);

            console.log('✅ Ticket marqué comme raté');
            return true;

        } catch (error) {
            console.error('❌ Erreur miss ticket:', error);
            stateManager.setError(error.message || 'Erreur');
            throw error;
        }
    }

    /**
     * S'abonner aux mises à jour d'une queue
     */
    static subscribeToQueueUpdates(queueId, callback) {
        console.log(`📨 Abonnement aux mises à jour queue: ${queueId}`);

        return wsClient.subscribeToQueue(queueId, (message) => {
            console.log('🔔 Mise à jour queue:', message);
            callback(message);
        });
    }
}

// Expose globalement
window.QueueService = QueueService;
