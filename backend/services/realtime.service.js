import logger from '../core/logger.js';

// realtime.service.js
// Service WebSocket temps réel pour WaQtek

import WebSocket, { WebSocketServer } from 'ws';

class RealtimeService {
    constructor() {
        this.wss = null;     // WebSocket Server
        this.clients = new Map(); // Stockage des clients + type + établissement
    }

    start(server) {
        this.wss = new WebSocketServer({ server });
        logger.info("🔌 WebSocket Server initialisé pour WaQtek");

        this.wss.on('connection', (ws, req) => {
            logger.info("🟢 Nouvelle connexion WebSocket");

            // Initialisation
            ws.clientInfo = {
                type: "unknown",
                establishmentId: null,
                queueId: null
            };

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    this.handleMessage(ws, msg);
                } catch (e) {
                    logger.error("❌ Erreur message WebSocket :", e);
                }
            });

            ws.on('close', () => {
                logger.info("🔴 Client WebSocket déconnecté");
            });
        });
    }

    handleMessage(ws, msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {

            // Identification initiale du client
            case "init":
                ws.clientInfo.type = msg.clientType;   // "display", "manager", "client"
                ws.clientInfo.establishmentId = msg.establishmentId || null;
                ws.clientInfo.queueId = msg.queueId || null;
                logger.info("👤 Client identifié :", ws.clientInfo);
                break;

            default:
                logger.info("ℹ️ Message WebSocket inconnu :", msg);
        }
    }

    // --- 🚀 Diffusion globale à un établissement ---
    broadcastToEstablishment(establishmentId, event, payload = {}) {
        this.sendWhere(
            ws =>
                ws.clientInfo.establishmentId === establishmentId,
            event,
            payload
        );
    }

    // --- 🚀 Diffusion à une queue ---
    broadcastToQueue(queueId, event, payload = {}) {
        this.sendWhere(
            ws =>
                ws.clientInfo.queueId === queueId,
            event,
            payload
        );
    }

    // --- 🚀 Envoyer un message ciblé ---
    sendWhere(filterFn, event, payload = {}) {
        if (!this.wss || !this.wss.clients) return; // <-- ajoute cette ligne

        const message = JSON.stringify({ event, payload });

        this.wss.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN && filterFn(ws)) {
                ws.send(message);
            }
        });
    }

    // --- Appels spécialisés utilisés dans les contrôleurs ---

    newTicket(queueId, ticket) {
        this.broadcastToQueue(queueId, "new_ticket", { ticket });
    }

    ticketCalled(queueId, ticket) {
        this.broadcastToQueue(queueId, "ticket_called", { ticket });
    }

    ticketStatusUpdated(queueId, ticket) {
        this.broadcastToQueue(queueId, "ticket_status_changed", { ticket });
    }

    queueUpdated(queueId, data) {
        this.broadcastToQueue(queueId, "queue_updated", {
            queueId,
            currentticketnumber: data.currentticketnumber
        });
    }
}

export default new RealtimeService();


