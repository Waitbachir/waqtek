import Queue from '../models/queue.model.js';
import Stats from '../models/stats.model.js';
import supabase from '../services/supabase.service.js';
import logger from '../core/logger.js';

class StatsController {
    getQueueEstablishmentId(queue) {
        return String(queue?.establishmentid ?? queue?.establishment_id ?? queue?.establishmentId ?? '');
    }

    normalizeDate(value) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    formatDayKey(value) {
        const d = this.normalizeDate(value);
        if (!d) return null;
        return d.toISOString().slice(0, 10);
    }

    formatMonthKey(value) {
        const d = this.normalizeDate(value);
        if (!d) return null;
        return d.toISOString().slice(0, 7);
    }

    toNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    getDateRange(req, defaultDays = 30) {
        const end = this.normalizeDate(req.query?.end || new Date()) || new Date();
        const start = this.normalizeDate(req.query?.start) || new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
        return { start, end };
    }

    async getScopedTickets(req) {
        const isAdmin = req.user?.role === 'admin';
        const requestedEstId = req.query?.establishment_id || req.query?.establishmentId || null;

        if (isAdmin) {
            if (requestedEstId) {
                return await supabase.findWhere('tickets', { establishment_id: requestedEstId });
            }
            return await supabase.findAll('tickets');
        }

        const tenantIds = req.tenant?.establishmentIds || [];
        const scopedIds = requestedEstId ? [String(requestedEstId)] : tenantIds;

        const all = await Promise.all(
            scopedIds.map((id) => supabase.findWhere('tickets', { establishment_id: id }))
        );

        return all.flat().filter(Boolean);
    }

    async getScopedConfirmedTransactions(req) {
        const tickets = await this.getScopedTickets(req);
        const ticketIds = new Set((Array.isArray(tickets) ? tickets : []).map((t) => String(t.id)));

        const allTransactions = await supabase.findAll('transactions');
        const txRows = Array.isArray(allTransactions) ? allTransactions : [];

        return txRows.filter((tx) => {
            const status = String(tx.status || '').toUpperCase();
            const txTicketId = tx.ticket_id;
            return status === 'CONFIRMED' && txTicketId !== null && txTicketId !== undefined && ticketIds.has(String(txTicketId));
        });
    }

    buildRevenueSeries(transactions, type, start, end) {
        const bucket = new Map();

        for (const tx of transactions) {
            const createdAt = this.normalizeDate(tx.created_at || tx.updated_at || new Date());
            if (!createdAt) continue;
            if (createdAt < start || createdAt > end) continue;

            const key = type === 'monthly' ? this.formatMonthKey(createdAt) : this.formatDayKey(createdAt);
            if (!key) continue;

            const prev = bucket.get(key) || { revenue: 0, transactions: 0 };
            prev.revenue += this.toNumber(tx.amount);
            prev.transactions += 1;
            bucket.set(key, prev);
        }

        const data = [...bucket.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => ({ period: key, revenue: value.revenue, transactions: value.transactions }));

        const totalRevenue = data.reduce((acc, row) => acc + row.revenue, 0);
        const totalTransactions = data.reduce((acc, row) => acc + row.transactions, 0);

        return { data, totalRevenue, totalTransactions };
    }

    async getRevenueDaily(req, res) {
        try {
            const { start, end } = this.getDateRange(req, 14);
            const transactions = await this.getScopedConfirmedTransactions(req);
            const series = this.buildRevenueSeries(transactions, 'daily', start, end);

            return res.status(200).json({
                success: true,
                period: {
                    type: 'daily',
                    start: start.toISOString(),
                    end: end.toISOString()
                },
                totals: {
                    revenue: series.totalRevenue,
                    transactions: series.totalTransactions
                },
                data: series.data
            });
        } catch (err) {
            logger.error('Erreur getRevenueDaily:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async getRevenueMonthly(req, res) {
        try {
            const { start, end } = this.getDateRange(req, 365);
            const transactions = await this.getScopedConfirmedTransactions(req);
            const series = this.buildRevenueSeries(transactions, 'monthly', start, end);

            return res.status(200).json({
                success: true,
                period: {
                    type: 'monthly',
                    start: start.toISOString(),
                    end: end.toISOString()
                },
                totals: {
                    revenue: series.totalRevenue,
                    transactions: series.totalTransactions
                },
                data: series.data
            });
        } catch (err) {
            logger.error('Erreur getRevenueMonthly:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async getVipCount(req, res) {
        try {
            const { start, end } = this.getDateRange(req, 365);
            const transactions = await this.getScopedConfirmedTransactions(req);
            const inRange = transactions.filter((tx) => {
                const createdAt = this.normalizeDate(tx.created_at || tx.updated_at || new Date());
                if (!createdAt) return false;
                return createdAt >= start && createdAt <= end;
            });

            return res.status(200).json({
                success: true,
                period: {
                    type: 'vip_count',
                    start: start.toISOString(),
                    end: end.toISOString()
                },
                total_vip_tickets: inRange.length,
                total_revenue: inRange.reduce((acc, tx) => acc + this.toNumber(tx.amount), 0)
            });
        } catch (err) {
            logger.error('Erreur getVipCount:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async getQueueStats(req, res) {
        try {
            const { queueId } = req.params;
            const queue = await Queue.findById(queueId);

            if (!queue) {
                return res.status(404).json({ error: 'Queue introuvable' });
            }

            const isAdmin = req.user?.role === 'admin';
            const queueEstablishmentId = this.getQueueEstablishmentId(queue);
            if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ error: 'Acces refuse (tenant)' });
            }

            const stats = Stats.getQueueStats(queueId);
            return res.status(200).json({ queue, stats });
        } catch (err) {
            logger.error('Erreur getQueueStats:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async getEstablishmentStats(req, res) {
        try {
            const { estId } = req.params;
            const isAdmin = req.user?.role === 'admin';
            if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(String(estId))) {
                return res.status(403).json({ error: 'Acces refuse (tenant)' });
            }

            const queues = await Queue.getByEstablishment(estId);
            if (!queues || queues.length === 0) {
                return res.status(404).json({ error: 'Aucune queue pour cet etablissement' });
            }

            const stats = Stats.getEstablishmentStats(estId, queues);
            return res.status(200).json({ establishmentId: estId, stats });
        } catch (err) {
            logger.error('Erreur getEstablishmentStats:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    async getAllStats(req, res) {
        try {
            const isAdmin = req.user?.role === 'admin';
            let queues = [];
            if (isAdmin) {
                queues = await Queue.getAll();
            } else {
                const estIds = req.tenant?.establishmentIds || [];
                queues = await Queue.getByEstablishmentIds(estIds);
            }
            const stats = Stats.getAllStats(queues);
            return res.status(200).json({ stats });
        } catch (err) {
            logger.error('Erreur getAllStats:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }
}

export default new StatsController();
