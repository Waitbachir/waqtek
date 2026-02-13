/**
 * TicketService.js - Service de gestion des tickets
 * Remplace les fonctions de tickets dans client.js et enterprise.js
 */

class TicketService {
    /**
     * Créer un ticket (client public)
     */
    static async createPublicTicket(queueId, establishmentId) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const clientId = stateManager.getClientId();

            const response = await apiClient.createTicketPublic(
                queueId,
                establishmentId,
                clientId
            );

            if (response.ticket) {
                stateManager.setCurrentTicket(response.ticket);
            }

            console.log('✅ Ticket créé:', response.ticket?.number);
            return response.ticket;

        } catch (error) {
            console.error('❌ Erreur création ticket:', error);
            stateManager.setError(error.message || 'Création échouée');
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Créer plusieurs tickets (pour test)
     */
    static async createMultipleTickets(queueId, establishmentId, count = 3) {
        try {
            stateManager.setLoading(true);
            stateManager.setError(null);

            const createdTickets = [];

            for (let i = 0; i < count; i++) {
                try {
                    const ticket = await this.createPublicTicket(queueId, establishmentId);
                    createdTickets.push(ticket);

                    // Délai pour éviter surcharger le serveur
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    console.error(`❌ Erreur création ticket ${i + 1}:`, error);
                }
            }

            console.log(`✅ ${createdTickets.length}/${count} tickets créés`);
            return createdTickets;

        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir les tickets d'une queue
     */
    static async getQueueTickets(queueId, params = {}) {
        try {
            stateManager.setLoading(true);

            const response = await apiClient.getTicketsByQueue(queueId, params);

            console.log(`✅ ${response.tickets?.length || 0} tickets chargés`);
            return response.tickets || [];

        } catch (error) {
            console.error('❌ Erreur chargement tickets:', error);
            throw error;
        } finally {
            stateManager.setLoading(false);
        }
    }

    /**
     * Obtenir les tickets en attente
     */
    static async getWaitingTickets(queueId) {
        try {
            const tickets = await this.getQueueTickets(queueId);

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
     * Appeler le prochain ticket
     */
    static async callNextTicket(queueId, counter = null) {
        try {
            const waitingTickets = await this.getWaitingTickets(queueId);

            if (!waitingTickets.length) {
                showToast('Aucun ticket en attente', 'info');
                return null;
            }

            const nextTicket = waitingTickets[0];
            await this.updateTicketStatus(nextTicket.id, 'called', counter ? { counter } : {});
            stateManager.setCurrentTicket(nextTicket);

            console.log('✅ Ticket appelé:', nextTicket.number);
            return nextTicket;

        } catch (error) {
            console.error('❌ Erreur appel ticket:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le statut d'un ticket
     */
    static async updateTicketStatus(ticketId, status, extraData = {}) {
        try {
            const validStatuses = ['waiting', 'called', 'served', 'missed', 'cancelled'];

            if (!validStatuses.includes(status)) {
                throw new Error(`Statut invalide: ${status}`);
            }

            const response = await apiClient.updateTicketStatus(ticketId, status, extraData);

            console.log(`✅ Ticket ${status}:`, ticketId);
            return response;

        } catch (error) {
            console.error('❌ Erreur mise à jour ticket:', error);
            throw error;
        }
    }

    /**
     * Marquer un ticket comme servi
     */
    static async serveTicket(ticketId) {
        return this.updateTicketStatus(ticketId, 'served');
    }

    /**
     * Marquer un ticket comme raté
     */
    static async missTicket(ticketId) {
        return this.updateTicketStatus(ticketId, 'missed');
    }

    /**
     * Marquer un ticket comme annulé
     */
    static async cancelTicket(ticketId) {
        return this.updateTicketStatus(ticketId, 'cancelled');
    }

    /**
     * Obtenir un ticket spécifique
     */
    static async getTicket(ticketId) {
        try {
            const response = await apiClient.getTicket(ticketId);
            return response.ticket || response;

        } catch (error) {
            console.error('❌ Erreur chargement ticket:', error);
            throw error;
        }
    }

    /**
     * S'abonner aux mises à jour d'un ticket
     */
    static subscribeToTicketUpdates(ticketId, callback) {
        console.log(`📨 Abonnement aux mises à jour du ticket: ${ticketId}`);

        return wsClient.subscribeToTicket(ticketId, (message) => {
            console.log('🔔 Mise à jour ticket:', message);
            callback(message);
        });
    }

    /**
     * S'abonner aux mises à jour d'une queue
     */
    static subscribeToQueueUpdates(queueId, callback) {
        console.log(`📨 Abonnement aux mises à jour de la queue: ${queueId}`);

        return wsClient.subscribeToQueue(queueId, (message) => {
            console.log('🔔 Mise à jour queue:', message);
            callback(message);
        });
    }
}

// Expose globalement
window.TicketService = TicketService;
