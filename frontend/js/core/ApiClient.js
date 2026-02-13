/**
 * ApiClient.js - Client API centralisé
 * Remplace toutes les fetch() directes dans enterprise.js et client.js
 */

class ApiClient {
    constructor(config = CONFIG) {
        this.baseUrl = config.API.BASE_URL;
        this.timeout = config.API.TIMEOUT;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Effectuer une requête API
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            params = {},
            timeout = this.timeout
        } = options;

        try {
            // Construire l'URL
            let url = `${this.baseUrl}${endpoint}`;

            // Ajouter les paramètres de query
            if (Object.keys(params).length > 0) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }

            // Préparer les headers
            const requestHeaders = {
                ...this.defaultHeaders,
                ...headers
            };

            // Ajouter le token si disponible
            const token = stateManager.getToken();
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }

            // Préparer les options de fetch
            const fetchOptions = {
                method,
                headers: requestHeaders
            };

            // Ajouter le body pour les requêtes non-GET
            if (method !== 'GET' && data) {
                fetchOptions.body = JSON.stringify(data);
            }

            // Afficher la requête en debug
            console.log(`📤 ${method} ${endpoint}`, data || '');

            // Envoyer la requête avec timeout
            const response = await Promise.race([
                fetch(url, fetchOptions),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), timeout)
                )
            ]);

            // Traiter la réponse
            return await this.handleResponse(response);

        } catch (error) {
            console.error(`❌ API Error (${method} ${endpoint}):`, error);
            stateManager.setError(error.message);
            throw error;
        }
    }

    /**
     * Traiter la réponse API
     */
    async handleResponse(response) {
        let data;

        try {
            data = await response.json();
        } catch (error) {
            // Si pas de JSON, retourner le texte
            data = { status: response.status };
        }

        if (!response.ok) {
            const error = new Error(data.message || data.error || 'API Error');
            error.status = response.status;
            error.data = data;

            console.error(`❌ API Response Error (${response.status}):`, error.message);
            stateManager.setError(error.message);

            throw error;
        }

        console.log(`✅ API Response:`, data);
        return data;
    }

    // ============================================
    // AUTH ENDPOINTS
    // ============================================

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            data: { email, password }
        });
        return data;
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            data: userData
        });
    }

    // ============================================
    // ESTABLISHMENTS ENDPOINTS
    // ============================================

    async getEstablishments() {
        return this.request('/establishments');
    }

    async getPublicEstablishments() {
        return this.request('/establishments/public/list');
    }

    async getEstablishment(id) {
        return this.request(`/establishments/${id}`);
    }

    async createEstablishment(data) {
        return this.request('/establishments', {
            method: 'POST',
            data
        });
    }

    async updateEstablishment(id, data) {
        return this.request(`/establishments/${id}`, {
            method: 'PUT',
            data
        });
    }

    async deleteEstablishment(id) {
        return this.request(`/establishments/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // QUEUES ENDPOINTS
    // ============================================

    async getQueues(params = {}) {
        return this.request('/queues', { params });
    }

    async getQueue(id) {
        return this.request(`/queues/${id}`);
    }

    async getQueuesByEstablishment(establishmentId) {
        return this.request(`/queues/establishment/${establishmentId}`);
    }

    async getPublicQueuesByEstablishment(establishmentId) {
        return this.request(`/queues/public/establishment/${establishmentId}`);
    }

    async createQueue(data) {
        return this.request('/queues', {
            method: 'POST',
            data
        });
    }

    async updateQueue(id, data) {
        return this.request(`/queues/${id}`, {
            method: 'PUT',
            data
        });
    }

    async deleteQueue(id) {
        return this.request(`/queues/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // TICKETS ENDPOINTS
    // ============================================

    async getTickets(params = {}) {
        return this.request('/tickets', { params });
    }

    async getTicket(id) {
        return this.request(`/tickets/${id}`);
    }

    async getTicketsByQueue(queueId, params = {}) {
        return this.request(`/tickets/queue/${queueId}`, { params });
    }

    async createTicket(data) {
        // Pour les tickets publics (clients)
        return this.request('/tickets/public/create', {
            method: 'POST',
            data
        });
    }

    async createTicketPublic(queueId, establishmentId, clientId) {
        return this.createTicket({
            queueId,
            establishment_id: establishmentId,
            clientId
        });
    }

    async createPosTicketPublic(queueId, remoteAccess = false) {
        return this.request('/tickets/public/pos-create', {
            method: 'POST',
            data: {
                queueId,
                remoteAccess
            }
        });
    }

    async updateTicketStatus(id, status, extraData = {}) {
        return this.request(`/tickets/${id}/status`, {
            method: 'PUT',
            data: { status, ...extraData }
        });
    }

    async callTicket(id) {
        return this.updateTicketStatus(id, 'called');
    }

    async serveTicket(id) {
        return this.updateTicketStatus(id, 'served');
    }

    async missTicket(id) {
        return this.updateTicketStatus(id, 'missed');
    }

    // ============================================
    // STATS ENDPOINTS
    // ============================================

    async getStats(params = {}) {
        return this.request('/stats/dashboard', { params });
    }

    async getQueueStats(queueId, params = {}) {
        return this.request(`/stats/queue/${queueId}`, { params });
    }

    async getEstablishmentStats(establishmentId, params = {}) {
        return this.request(`/stats/establishment/${establishmentId}`, { params });
    }

    async getRevenueDaily(params = {}) {
        return this.request('/stats/revenue/daily', { params });
    }

    async getRevenueMonthly(params = {}) {
        return this.request('/stats/revenue/monthly', { params });
    }

    async getVipCount(params = {}) {
        return this.request('/stats/vip/count', { params });
    }

    // ============================================
    // USERS ENDPOINTS
    // ============================================

    async getCurrentUser() {
        return this.request('/users/profile');
    }

    async updateProfile(data) {
        return this.request('/users/profile', {
            method: 'PUT',
            data
        });
    }

    async getUsers(params = {}) {
        return this.request('/users', { params });
    }

    // ============================================
    // SUBSCRIPTIONS ENDPOINTS
    // ============================================

    async getSubscriptions() {
        return this.request('/subscriptions');
    }

    async getSubscription(id) {
        return this.request(`/subscriptions/${id}`);
    }

    async createSubscription(data) {
        return this.request('/subscriptions', {
            method: 'POST',
            data
        });
    }

    async updateSubscription(id, data) {
        return this.request(`/subscriptions/${id}`, {
            method: 'PUT',
            data
        });
    }

    // ============================================
    // VIDEOS ENDPOINTS
    // ============================================

    async getVideosByEstablishment(establishmentId) {
        return this.request(`/videos/establishment/${establishmentId}`);
    }

    async getVideo(id) {
        return this.request(`/videos/${id}`);
    }

    async createVideo(data) {
        return this.request('/videos', {
            method: 'POST',
            data
        });
    }

    // ============================================
    // NOTIFICATIONS ENDPOINTS
    // ============================================

    async sendNotification(data) {
        return this.request('/notifications/send', {
            method: 'POST',
            data
        });
    }

    async getNotifications(params = {}) {
        return this.request('/notifications', { params });
    }

    async markNotificationAsRead(id) {
        return this.request(`/notifications/${id}`, {
            method: 'PUT',
            data: { read: true }
        });
    }

    async deleteNotification(id) {
        return this.request(`/notifications/${id}`, {
            method: 'DELETE'
        });
    }

    // ============================================
    // GENERIC HELPERS
    // ============================================

    /**
     * Effectuer une requête générique
     */
    async get(endpoint, params = {}) {
        return this.request(endpoint, { method: 'GET', params });
    }

    async post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', data });
    }

    async put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', data });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async patch(endpoint, data) {
        return this.request(endpoint, { method: 'PATCH', data });
    }
}

// Instance singleton globale
const apiClient = new ApiClient(CONFIG);

// Expose globalement pour debug
window.api = apiClient;

