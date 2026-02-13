import logger from '../core/logger.js';

// push.controller.js
// Gestion des notifications Web Push + Mobile FCM pour WaQtek

import NotificationsService from '../services/notifications.service.js';
import SubscriptionModel from '../models/subscriptions.model.js'; // Pour vérifier l'abonnement
import Ticket from '../models/ticket.model.js';

class PushController {

    // --- 🔹 Enregistrement d'un client pour notifications ---
    // body: { clientType: "web" | "mobile", token: "string", establishmentId: "uuid" }
    async registerClient(req, res) {
        try {
            const { clientType, token, establishmentId } = req.body;

            if (!clientType || !token || !establishmentId) {
                return res.status(400).json({ error: "Données manquantes" });
            }

            // Ici, normalement on stockerait dans une BDD ou Supabase
            // Pour l'instant, stockage en mémoire simulé
            if (!global.pushClients) global.pushClients = [];
            const existing = global.pushClients.find(c => c.token === token);
            if (!existing) {
                global.pushClients.push({ clientType, token, establishmentId });
            }

            res.status(201).json({ message: "Client enregistré pour notifications", client: { clientType, token, establishmentId } });

        } catch (err) {
            logger.error("Erreur registerClient:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- 🔹 Envoi d'une notification test ---
    // body: { clientType: "web" | "mobile", token: "string", title: "string", body: "string" }
    async sendTestNotification(req, res) {
        try {
            const { clientType, token, title, body } = req.body;
            if (!clientType || !token || !title || !body) {
                return res.status(400).json({ error: "Données manquantes" });
            }

            const payload = { title, body };

            if (clientType === "web") {
                await NotificationsService.sendWebNotification({ endpoint: token }, payload);
            } else if (clientType === "mobile") {
                await NotificationsService.sendMobileNotification(token, payload);
            } else {
                return res.status(400).json({ error: "Type client invalide" });
            }

            res.status(200).json({ message: "Notification test envoyée", payload });

        } catch (err) {
            logger.error("Erreur sendTestNotification:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- 🔹 Notifications automatiques pour un ticket (optionnel) ---
    // type: "new_ticket" | "ticket_called" | "ticket_status_changed"
    async notifyTicket(req, res) {
        try {
            const { ticketId, type } = req.body;
            if (!ticketId || !type) return res.status(400).json({ error: "Données manquantes" });

            const ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });

            // Vérifier l'abonnement de l'établissement pour limiter certaines notifications
            const subs = await SubscriptionModel.getActiveByEstablishment(ticket.establishmentId);
            if (subs.length > 0 && subs[0].plan === "FREE") {
                // Par exemple, ne pas envoyer certaines notifications
                logger.info("Plan FREE : certaines notifications peuvent être limitées");
            }

            switch(type) {
                case "new_ticket":
                    NotificationsService.notifyNewTicket(ticket.queueId, ticket);
                    break;
                case "ticket_called":
                    NotificationsService.notifyTicketCalled(ticket);
                    break;
                case "ticket_status_changed":
                    NotificationsService.notifyStatusChanged(ticket.queueId, ticket);
                    break;
                default:
                    return res.status(400).json({ error: "Type notification invalide" });
            }

            res.status(200).json({ message: "Notification envoyée", ticket, type });

        } catch(err) {
            logger.error("Erreur notifyTicket:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }
}

export default new PushController();



