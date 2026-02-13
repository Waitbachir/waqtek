/**
 * WebSocketClient.js - Client WebSocket centralisé pour temps réel
 * Remplace websocket.js et les WebSocket directs dans client.js et enterprise.js
 */

class WebSocketClient {
    constructor(config = CONFIG) {
        this.config = config;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.messageHandlers = new Map();
        this.subscriptions = new Map();
        this.isReconnecting = false;
        this.lastMessageTime = null;
        this.heartbeatInterval = null;

        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onError = null;
    }

    /**
     * Établir la connexion WebSocket
     */
    connect() {
        if (this.socket) {
            console.warn('⚠️ WebSocket déjà connecté');
            return;
        }

        try {
            // Construire l'URL WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = this.config.WEBSOCKET.URL;
            
            // Normaliser l'URL
            const cleanUrl = wsUrl.replace(/^wss?:\/\//, '');
            const fullUrl = `${protocol}//${cleanUrl}`;

            console.log(`🔌 Connexion WebSocket: ${fullUrl}`);

            this.socket = new WebSocket(fullUrl);
            this.socket.addEventListener('open', () => this.handleOpen());
            this.socket.addEventListener('message', (event) => this.handleMessage(event));
            this.socket.addEventListener('close', () => this.handleClose());
            this.socket.addEventListener('error', (error) => this.handleError(error));

        } catch (error) {
            console.error('❌ Erreur création WebSocket:', error);
            this.handleError(error);
        }
    }

    /**
     * Gérer l'ouverture de connexion
     */
    handleOpen() {
        console.log('✅ WebSocket connecté');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        stateManager.setConnected(true);

        if (this.onConnect) {
            this.onConnect();
        }

        // Envoyer un ping pour tester
        this.send({
            type: 'ping',
            timestamp: new Date().toISOString()
        });

        // Établir un heartbeat
        this.setupHeartbeat();
    }

    /**
     * Gérer les messages reçus
     */
    handleMessage(event) {
        this.lastMessageTime = Date.now();

        try {
            const message = JSON.parse(event.data);

            console.log(`📨 WebSocket message [${message.type}]:`, message);

            // Chercher des handlers spécifiques pour ce type
            if (this.messageHandlers.has(message.type)) {
                const handlers = this.messageHandlers.get(message.type);
                handlers.forEach(handler => {
                    try {
                        handler(message);
                    } catch (error) {
                        console.error('❌ Erreur dans le handler message:', error);
                    }
                });
            }

            // Handler générique
            if (this.messageHandlers.has('*')) {
                const handlers = this.messageHandlers.get('*');
                handlers.forEach(handler => handler(message));
            }

        } catch (error) {
            console.error('❌ Erreur parsing WebSocket message:', error);
        }
    }

    /**
     * Gérer la fermeture
     */
    handleClose() {
        console.log('⚠️ WebSocket fermé');
        this.socket = null;
        stateManager.setConnected(false);

        if (this.onDisconnect) {
            this.onDisconnect();
        }

        // Tenter une reconnexion
        this.scheduleReconnect();
    }

    /**
     * Gérer les erreurs
     */
    handleError(error) {
        console.error('❌ Erreur WebSocket:', error);
        stateManager.setError(`WebSocket: ${error.message}`);

        if (this.onError) {
            this.onError(error);
        }
    }

    /**
     * Programmer une reconnexion
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.config.WEBSOCKET.MAX_RECONNECT_ATTEMPTS) {
            console.error('❌ Nombre max de tentatives de reconnexion atteint');
            showToast('Impossible de reconnecter au serveur', 'error');
            return;
        }

        if (this.isReconnecting) {
            return; // Reconnexion déjà programmée
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        const delay = this.config.WEBSOCKET.RECONNECT_INTERVAL * this.reconnectAttempts;

        console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.config.WEBSOCKET.MAX_RECONNECT_ATTEMPTS})`);

        setTimeout(() => {
            if (!this.isConnected()) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Configuration du heartbeat
     */
    setupHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // Ping toutes les 30s
    }

    /**
     * Envoyer un message
     */
    send(message) {
        if (!this.isConnected()) {
            console.warn('⚠️ WebSocket non connecté, message non envoyé:', message);
            return false;
        }

        try {
            console.log(`📤 WebSocket envoi [${message.type}]:`, message);
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('❌ Erreur envoi WebSocket:', error);
            return false;
        }
    }

    /**
     * S'abonner à un type de message
     */
    subscribe(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }

        const handlers = this.messageHandlers.get(messageType);
        handlers.push(handler);

        console.log(`✅ Abonnement: ${messageType}`);

        // Retourner une fonction pour se désabonner
        return () => {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                console.log(`❌ Désabonnement: ${messageType}`);
            }
        };
    }

    /**
     * S'abonner à une queue
     */
    subscribeToQueue(queueId, handler) {
        const unsubscribe = this.subscribe('queue_updated', (message) => {
            if (message.payload?.queueId === queueId) {
                handler(message);
            }
        });

        return unsubscribe;
    }

    /**
     * S'abonner à un ticket
     */
    subscribeToTicket(ticketId, handler) {
        const unsubscribe = this.subscribe('ticket_updated', (message) => {
            if (message.payload?.ticketId === ticketId || message.payload?.ticket?.id === ticketId) {
                handler(message);
            }
        });

        return unsubscribe;
    }

    /**
     * Vérifier si connecté
     */
    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    /**
     * Déconnecter
     */
    disconnect() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.socket) {
            console.log('🔌 Déconnexion WebSocket');
            this.socket.close();
            this.socket = null;
        }

        stateManager.setConnected(false);
    }

    /**
     * Debug
     */
    debug() {
        console.group('🐛 WEBSOCKET DEBUG');
        console.log('État:', {
            connected: this.isConnected(),
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: Array.from(this.messageHandlers.keys()),
            lastMessage: this.lastMessageTime ? new Date(this.lastMessageTime) : null
        });
        console.groupEnd();
    }
}

// Instance singleton globale
const wsClient = new WebSocketClient(CONFIG);

// Expose globalement pour debug
window.ws = wsClient;
