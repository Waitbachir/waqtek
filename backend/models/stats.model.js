
// stats.model.js
import Ticket from './ticket.model.js';

class Stats {

    // Tickets d’une queue
    static getQueueStats(queueId) {
        const tickets = Ticket.tickets.filter(t => t.queueId === queueId);
        const total = tickets.length;
        const served = tickets.filter(t => t.status === 'served').length;
        const waiting = tickets.filter(t => t.status === 'waiting').length;
        const canceled = tickets.filter(t => t.status === 'canceled').length;
        return { total, served, waiting, canceled };
    }

    // Tickets d’un établissement
    static getEstablishmentStats(establishmentId, queues) {
        const stats = {};
        if (!Array.isArray(queues)) return stats;
        queues.forEach(q => {
            stats[q.id] = this.getQueueStats(q.id);
        });
        return stats;
    }

    // Statistiques globales
    static getAllStats(queues) {
        if (!Array.isArray(queues)) return {};
        return this.getEstablishmentStats(null, queues);
    }
}

export default Stats;


