import logger from '../core/logger.js';

class NotificationsService {

    notifyNewTicket(queueId, ticket) {
        logger.info("🔔 Nouveau ticket", {
            queueId,
            number: ticket.number
        });
    }

    notifyStatusChanged(queueId, ticket) {
        logger.info("🔄 Statut changé", ticket.status);
    }

    notifyTicketCalled(ticket) {
        logger.info("📢 Ticket appelé", ticket.number);
    }
}

export default new NotificationsService();

