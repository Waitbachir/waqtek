import Queue from '../models/queue.model.js';
import Establishment from '../models/establishment.model.js';
import Ticket from '../models/ticket.model.js';
import logger from '../core/logger.js';
import ManagerContextService from '../services/manager-context.service.js';

class QueuesController {
    static getQueueEstablishmentId(queue) {
        return String(queue?.establishmentid ?? queue?.establishment_id ?? queue?.establishmentId ?? '');
    }

    static async create(req, res) {
        try {
            const { establishmentid, name, type, description } = req.body;

            if (!establishmentid) {
                return res.status(400).json({ message: 'establishmentid manquant' });
            }

            if (!req.tenant?.canAccessEstablishmentId?.(establishmentid)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const est = await Establishment.findById(establishmentid);
            if (!est) {
                return res.status(404).json({ message: 'Etablissement non trouve' });
            }

            const queue = await Queue.create({
                establishmentid,
                name,
                type,
                description
            });

            return res.status(201).json({
                message: "File d'attente creee",
                queue
            });
        } catch (err) {
            logger.error('Queue create error:', err);
            return res.status(400).json({ message: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const isAdmin = req.user?.role === 'admin';
            let queues = [];

            if (isAdmin) {
                queues = await Queue.getAll();
            } else {
                const estIds = req.tenant?.establishmentIds || [];
                queues = await Queue.getByEstablishmentIds(estIds);
            }

            return res.status(200).json({ queues });
        } catch (err) {
            logger.error('Queues getAll error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async getActive(req, res) {
        try {
            const isAdmin = req.user?.role === 'admin';
            const requestedEstId = req.query?.establishment_id || req.query?.establishmentId || null;

            let queues = [];
            if (isAdmin) {
                if (requestedEstId) {
                    queues = await Queue.getByEstablishment(requestedEstId);
                } else {
                    queues = await Queue.getAll();
                }
            } else {
                let estIds = req.tenant?.establishmentIds || [];
                if (requestedEstId) {
                    if (!req.tenant?.canAccessEstablishmentId?.(requestedEstId)) {
                        return res.status(403).json({ message: 'Acces refuse (tenant)' });
                    }
                    estIds = [String(requestedEstId)];
                }
                queues = await Queue.getByEstablishmentIds(estIds);
            }

            const lists = await Promise.all(
                (queues || []).map(async (queue) => {
                    const tickets = await Ticket.findByQueue(queue.id);
                    const activeTickets = (Array.isArray(tickets) ? tickets : []).filter((t) =>
                        String(t.status || '').toLowerCase() === 'waiting' ||
                        String(t.status || '').toLowerCase() === 'called'
                    );
                    return {
                        queue,
                        activeCount: activeTickets.length
                    };
                })
            );

            const activeQueues = lists
                .filter((item) => item.activeCount > 0)
                .map((item) => ({
                    ...item.queue,
                    active_tickets: item.activeCount
                }));

            return res.status(200).json({ queues: activeQueues });
        } catch (err) {
            logger.error('Queues getActive error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async getByEstablishment(req, res) {
        try {
            const { estId } = req.params;

            if (!req.tenant?.canAccessEstablishmentId?.(estId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const est = await Establishment.findById(estId);
            if (!est) return res.status(404).json({ message: 'Etablissement non trouve' });

            const queues = await Queue.getByEstablishment(estId);
            return res.status(200).json({ queues });
        } catch (err) {
            logger.error('Queues by establishment error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async getByEstablishmentPublic(req, res) {
        try {
            const { estId } = req.params;
            const est = await Establishment.findById(estId);
            if (!est) return res.status(404).json({ message: 'Etablissement non trouve' });

            const queues = await Queue.getByEstablishment(estId);
            return res.status(200).json({ queues: queues || [] });
        } catch (err) {
            logger.error('Queues public by establishment error:', err);
            return res.status(500).json({ message: err.message || 'Erreur serveur' });
        }
    }

    static async getById(req, res) {
        try {
            const queue = await Queue.findById(req.params.id);
            if (!queue) return res.status(404).json({ message: "File d'attente non trouvee" });

            const isAdmin = req.user?.role === 'admin';
            const queueEstablishmentId = QueuesController.getQueueEstablishmentId(queue);
            if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            return res.status(200).json({ queue });
        } catch (err) {
            logger.error('Queue getById error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const queue = await Queue.findById(id);

            if (!queue) {
                return res.status(404).json({ message: "File d'attente non trouvee" });
            }

            const isAdmin = req.user?.role === 'admin';
            const queueEstablishmentId = QueuesController.getQueueEstablishmentId(queue);
            if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const updated = await Queue.update(id, req.body);
            return res.status(200).json({
                message: "File d'attente mise a jour",
                queue: updated
            });
        } catch (err) {
            logger.error('Queue update error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const queue = await Queue.findById(id);

            if (!queue) {
                return res.status(404).json({ message: "File d'attente non trouvee" });
            }

            const isAdmin = req.user?.role === 'admin';
            const queueEstablishmentId = QueuesController.getQueueEstablishmentId(queue);
            if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const deleted = await Queue.delete(id);

            return res.status(200).json({
                message: "File d'attente supprimee",
                queue: deleted
            });
        } catch (err) {
            logger.error('Queue delete error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async getAvailableCounters(req, res) {
        try {
            const { queueId } = req.params;
            const queue = await Queue.findById(queueId);

            if (!queue) {
                return res.status(404).json({ message: "File d'attente non trouvee" });
            }

            const queueEstablishmentId = QueuesController.getQueueEstablishmentId(queue);
            if (!req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const available = await ManagerContextService.getAvailableCounters(queueId, {
                currentUserId: req.user?.id
            });
            const occupied = await ManagerContextService.getOccupiedCounters(queueId);

            return res.status(200).json({
                queueId: String(queueId),
                availableCounters: available,
                occupiedCounters: occupied
            });
        } catch (err) {
            logger.error('Queue getAvailableCounters error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async saveManagerContext(req, res) {
        try {
            const userId = req.user?.id;
            const { queueId, counter } = req.body;

            const queue = await Queue.findById(queueId);
            if (!queue) {
                return res.status(404).json({ message: "File d'attente non trouvee" });
            }

            const queueEstablishmentId = QueuesController.getQueueEstablishmentId(queue);
            if (!req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)' });
            }

            const available = await ManagerContextService.getAvailableCounters(queueId, {
                currentUserId: userId
            });
            const normalizedCounter = Number(counter);
            if (!available.includes(normalizedCounter)) {
                return res.status(409).json({
                    error: 'COUNTER_OCCUPIED',
                    message: 'Ce guichet est deja occupe',
                    availableCounters: available
                });
            }

            const context = ManagerContextService.setContext({
                userId,
                establishmentId: queueEstablishmentId,
                queueId,
                counter: normalizedCounter
            });

            return res.status(200).json({ context });
        } catch (err) {
            logger.error('Queue saveManagerContext error:', err);
            return res.status(500).json({ message: err.message });
        }
    }

    static async getManagerContext(req, res) {
        try {
            const context = ManagerContextService.getContext(req.user?.id);
            if (!context) {
                return res.status(404).json({
                    error: 'MANAGER_CONTEXT_NOT_FOUND',
                    message: 'Aucun contexte manager actif'
                });
            }

            if (!req.tenant?.canAccessEstablishmentId?.(context.establishmentId)) {
                ManagerContextService.clearContext(req.user?.id);
                return res.status(404).json({
                    error: 'MANAGER_CONTEXT_NOT_FOUND',
                    message: 'Aucun contexte manager actif'
                });
            }

            return res.status(200).json({ context });
        } catch (err) {
            logger.error('Queue getManagerContext error:', err);
            return res.status(500).json({ message: err.message });
        }
    }
}

export default QueuesController;
