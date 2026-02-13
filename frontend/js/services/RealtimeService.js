/**
 * RealtimeService.js - Service temps réel
 * Unif Supabase + WebSocket
 */

class RealtimeService {
    static supabaseClient = null;
    static subscriptions = new Map();

    /**
     * Initialiser Supabase
     */
    static initSupabase(supabaseUrl, supabaseKey) {
        try {
            if (!window.supabase) {
                console.warn('⚠️ Supabase client non chargé');
                return;
            }

            this.supabaseClient = window.supabase.createClient(
                supabaseUrl,
                supabaseKey
            );

            console.log('✅ Supabase initialisé');
        } catch (error) {
            console.error('❌ Erreur init Supabase:', error);
        }
    }

    /**
     * S'abonner aux changements d'une queue (Supabase)
     */
    static subscribeToQueueChanges(queueId, callback) {
        if (!this.supabaseClient) {
            console.warn('⚠️ Supabase non initialisé');
            return null;
        }

        try {
            const subscription = this.supabaseClient
                .channel(`queue-${queueId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets',
                        filter: `queue_id=eq.${queueId}`
                    },
                    (payload) => {
                        console.log('🔔 Supabase queue change:', payload);
                        callback(payload);
                    }
                )
                .subscribe();

            this.subscriptions.set(`queue-${queueId}`, subscription);
            console.log(`✅ Abonnement queue Supabase: ${queueId}`);

            return subscription;

        } catch (error) {
            console.error('❌ Erreur abonnement queue:', error);
            return null;
        }
    }

    /**
     * S'abonner aux changements d'un ticket (Supabase)
     */
    static subscribeToTicketChanges(ticketId, callback) {
        if (!this.supabaseClient) {
            console.warn('⚠️ Supabase non initialisé');
            return null;
        }

        try {
            const subscription = this.supabaseClient
                .channel(`ticket-${ticketId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets',
                        filter: `id=eq.${ticketId}`
                    },
                    (payload) => {
                        console.log('🔔 Supabase ticket change:', payload);
                        callback(payload);
                    }
                )
                .subscribe();

            this.subscriptions.set(`ticket-${ticketId}`, subscription);
            console.log(`✅ Abonnement ticket Supabase: ${ticketId}`);

            return subscription;

        } catch (error) {
            console.error('❌ Erreur abonnement ticket:', error);
            return null;
        }
    }

    /**
     * S'abonner via WebSocket (fallback)
     */
    static subscribeToQueueViaWebSocket(queueId, callback) {
        console.log(`📨 Abonnement queue WebSocket: ${queueId}`);
        return wsClient.subscribeToQueue(queueId, callback);
    }

    /**
     * S'abonner via WebSocket (ticket)
     */
    static subscribeToTicketViaWebSocket(ticketId, callback) {
        console.log(`📨 Abonnement ticket WebSocket: ${ticketId}`);
        return wsClient.subscribeToTicket(ticketId, callback);
    }

    /**
     * Désabonner de tous les changements
     */
    static unsubscribeAll() {
        this.subscriptions.forEach((subscription) => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                console.warn('⚠️ Erreur désabonnement:', error);
            }
        });

        this.subscriptions.clear();
        console.log('✅ Tous les abonnements fermés');
    }

    /**
     * S'abonner intelligemment (Supabase + fallback WebSocket)
     */
    static subscribeToQueue(queueId, callback) {
        // Essayer Supabase d'abord
        const supabaseSub = this.subscribeToQueueChanges(queueId, callback);

        if (supabaseSub) {
            return supabaseSub;
        }

        // Fallback sur WebSocket
        console.log('⚠️ Fallback vers WebSocket pour queue');
        return this.subscribeToQueueViaWebSocket(queueId, callback);
    }

    /**
     * S'abonner intelligemment (Supabase + fallback WebSocket)
     */
    static subscribeToTicket(ticketId, callback) {
        // Essayer Supabase d'abord
        const supabaseSub = this.subscribeToTicketChanges(ticketId, callback);

        if (supabaseSub) {
            return supabaseSub;
        }

        // Fallback sur WebSocket
        console.log('⚠️ Fallback vers WebSocket pour ticket');
        return this.subscribeToTicketViaWebSocket(ticketId, callback);
    }

    /**
     * Connecter WebSocket
     */
    static connectWebSocket() {
        console.log('🔌 Connexion WebSocket');
        wsClient.connect();

        return {
            onConnect: (callback) => {
                wsClient.onConnect = callback;
            },
            onDisconnect: (callback) => {
                wsClient.onDisconnect = callback;
            }
        };
    }

    /**
     * Vérifier si connecté
     */
    static isConnected() {
        return wsClient.isConnected();
    }

    /**
     * Obtenir l'état de connexion
     */
    static getConnectionStatus() {
        return {
            websocket: wsClient.isConnected(),
            supabase: !!this.supabaseClient
        };
    }
}

// Expose globalement
window.RealtimeService = RealtimeService;
