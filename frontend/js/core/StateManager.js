/**
 * StateManager.js - Gestion centralisée de l'état de l'application
 * Remplace le spaghetti localStorage et variables globales
 */

class StateManager {
    constructor() {
        this.state = {
            // Auth
            token: null,
            user: null,
            isAuthenticated: false,

            // Current session
            currentTicket: null,
            currentQueue: null,
            currentEstablishment: null,
            clientId: null,

            // UI
            loading: false,
            error: null,
            selectedEstablishment: null,
            selectedQueue: null,

            // Real-time
            isConnected: false,
            realtimeEnabled: true
        };

        this.listeners = new Map();
        this.loadFromStorage();
    }

    // ===== SAFE STORAGE HELPERS =====
    getStorage() {
        try {
            return localStorage;
        } catch (error) {
            return null;
        }
    }

    safeGet(key) {
        const storage = this.getStorage();
        return storage ? storage.getItem(key) : null;
    }

    safeSet(key, value) {
        const storage = this.getStorage();
        if (!storage) return;
        storage.setItem(key, value);
    }

    safeRemove(key) {
        const storage = this.getStorage();
        if (!storage) return;
        storage.removeItem(key);
    }

    generateClientId() {
        if (typeof crypto !== 'undefined') {
            if (typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            if (typeof crypto.getRandomValues === 'function') {
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);
                // RFC4122 v4
                bytes[6] = (bytes[6] & 0x0f) | 0x40;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;
                const toHex = (b) => b.toString(16).padStart(2, '0');
                const hex = Array.from(bytes, toHex).join('');
                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            }
        }

        return `cid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    /**
     * Charger l'état depuis localStorage
     */
    loadFromStorage() {
        try {
            const token = this.safeGet(CONFIG.STORAGE.TOKEN_KEY);
            if (token) {
                this.state.token = token;
                this.state.isAuthenticated = true;
            }

            const user = this.safeGet(CONFIG.STORAGE.USER_KEY);
            if (user) {
                this.state.user = JSON.parse(user);
            }

            const clientId = this.safeGet(CONFIG.STORAGE.CLIENT_ID_KEY);
            if (clientId) {
                this.state.clientId = clientId;
            } else {
                // Créer un nouveau clientId
                this.setClientId(this.generateClientId());
            }
        } catch (error) {
            console.error('? Erreur chargement state localStorage:', error);
            if (!this.state.clientId) {
                this.state.clientId = this.generateClientId();
            }
        }
    }

    /**
     * Définir le token auth
     */
    setToken(token) {
        this.setState('token', token);
        this.setState('isAuthenticated', !!token);

        if (token) {
            this.safeSet(CONFIG.STORAGE.TOKEN_KEY, token);
        } else {
            this.safeRemove(CONFIG.STORAGE.TOKEN_KEY);
        }

        console.log('?? Token mis à jour:', !!token);
    }

    /**
     * Obtenir le token
     */
    getToken() {
        return this.state.token;
    }

    /**
     * Vérifier authentification
     */
    isAuthenticated() {
        return this.state.isAuthenticated && !!this.state.token;
    }

    /**
     * Définir l'utilisateur
     */
    setUser(user) {
        this.setState('user', user);

        if (user) {
            this.safeSet(CONFIG.STORAGE.USER_KEY, JSON.stringify(user));
        } else {
            this.safeRemove(CONFIG.STORAGE.USER_KEY);
        }

        console.log('?? Utilisateur mis à jour:', user?.email);
    }

    /**
     * Obtenir l'utilisateur
     */
    getUser() {
        return this.state.user;
    }

    /**
     * Définir le clientId (pour clients)
     */
    setClientId(clientId) {
        this.setState('clientId', clientId);
        this.safeSet(CONFIG.STORAGE.CLIENT_ID_KEY, clientId);
    }

    /**
     * Obtenir le clientId
     */
    getClientId() {
        return this.state.clientId;
    }

    /**
     * Définir le ticket actuel
     */
    setCurrentTicket(ticket) {
        this.setState('currentTicket', ticket);
        console.log('?? Ticket actuel:', ticket?.number);
    }

    /**
     * Obtenir le ticket actuel
     */
    getCurrentTicket() {
        return this.state.currentTicket;
    }

    /**
     * Définir la queue actuelle
     */
    setCurrentQueue(queue) {
        this.setState('currentQueue', queue);
        console.log('?? Queue actuelle:', queue?.name);
    }

    /**
     * Obtenir la queue actuelle
     */
    getCurrentQueue() {
        return this.state.currentQueue;
    }

    /**
     * Définir l'établissement actuel
     */
    setCurrentEstablishment(establishment) {
        this.setState('currentEstablishment', establishment);
        console.log('?? Établissement actuel:', establishment?.name);
    }

    /**
     * Obtenir l'établissement actuel
     */
    getCurrentEstablishment() {
        return this.state.currentEstablishment;
    }

    /**
     * Définir l'établissement sélectionné
     */
    setSelectedEstablishment(estId) {
        this.setState('selectedEstablishment', estId);
    }

    /**
     * Obtenir l'établissement sélectionné
     */
    getSelectedEstablishment() {
        return this.state.selectedEstablishment;
    }

    /**
     * Définir la queue sélectionnée
     */
    setSelectedQueue(queueId) {
        this.setState('selectedQueue', queueId);
    }

    /**
     * Obtenir la queue sélectionnée
     */
    getSelectedQueue() {
        return this.state.selectedQueue;
    }

    /**
     * Définir l'état de chargement
     */
    setLoading(loading) {
        this.setState('loading', loading);
    }

    /**
     * Est en chargement?
     */
    isLoading() {
        return this.state.loading;
    }

    /**
     * Définir erreur
     */
    setError(error) {
        this.setState('error', error);
        if (error) {
            console.error('?? Erreur:', error);
        }
    }

    /**
     * Obtenir erreur
     */
    getError() {
        return this.state.error;
    }

    /**
     * Définir l'état de connexion WebSocket
     */
    setConnected(connected) {
        this.setState('isConnected', connected);
        console.log(`?? WebSocket ${connected ? '? connecté' : '? déconnecté'}`);
    }

    /**
     * Est connecté au WebSocket?
     */
    isConnected() {
        return this.state.isConnected;
    }

    /**
     * Obtenir tout l'état (debug)
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Listener pour changements d'état
     */
    onChange(keys, callback) {
        if (!Array.isArray(keys)) {
            keys = [keys];
        }

        const listenerId = Math.random().toString(36).substr(2, 9);
        this.listeners.set(listenerId, { keys, callback });

        return () => this.listeners.delete(listenerId);
    }

    /**
     * Définir une valeur d'état
     */
    setState(key, value) {
        const oldValue = this.state[key];

        if (oldValue === value) {
            return; // Pas de changement
        }

        this.state[key] = value;

        // Notifier les listeners
        this.listeners.forEach(({ keys, callback }) => {
            if (keys.includes(key)) {
                try {
                    callback(this.state[key], oldValue);
                } catch (error) {
                    console.error('? Erreur listener:', error);
                }
            }
        });
    }

    /**
     * Réinitialiser l'état (logout)
     */
    reset() {
        this.setState('token', null);
        this.setState('user', null);
        this.setState('isAuthenticated', false);
        this.setState('currentTicket', null);
        this.setState('currentQueue', null);
        this.setState('currentEstablishment', null);
        this.setState('selectedEstablishment', null);
        this.setState('selectedQueue', null);
        this.setState('error', null);
        this.setState('isConnected', false);

        this.safeRemove(CONFIG.STORAGE.TOKEN_KEY);
        this.safeRemove(CONFIG.STORAGE.USER_KEY);

        console.log('?? État réinitialisé (logout)');
    }

    /**
     * Debug: Afficher l'état complet
     */
    debug() {
        console.group('?? STATE MANAGER DEBUG');
        console.table(this.getState());
        console.groupEnd();
    }
}

// Instance singleton globale
const stateManager = new StateManager();

// Expose globalement pour debug
window.state = stateManager;
