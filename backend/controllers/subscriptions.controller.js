import logger from '../core/logger.js';

// subscriptions.controller.js
// Gestion des abonnements WaQtek

import Subscription from '../models/subscriptions.model.js';

class SubscriptionsController {
    // Route compatibility layer for existing router names.
    async getSubscriptions(req, res) {
        try {
            const estId = req.query?.establishmentId || req.query?.estId;
            if (!estId) {
                return res.status(400).json({ error: "establishmentId manquant" });
            }
            const subs = await Subscription.findByEstablishment(estId);
            return res.status(200).json({ subscriptions: subs || [] });
        } catch (err) {
            logger.error("Erreur getSubscriptions:", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async createSubscription(req, res) {
        return this.create(req, res);
    }

    async updateSubscription(req, res) {
        return this.update(req, res);
    }

    async deleteSubscription(req, res) {
        return this.delete(req, res);
    }

    // --- CREATE SUBSCRIPTION ---
    async create(req, res) {
        try {
            const { establishmentId, plan, startDate, endDate } = req.body;
            if (!establishmentId || !plan) return res.status(400).json({ error: "Données manquantes" });

            const subscription = await Subscription.create({ establishmentId, plan, startDate, endDate });
            return res.status(201).json({ subscription });
        } catch (err) {
            logger.error("Erreur create subscription:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- GET SUBSCRIPTION BY ESTABLISHMENT ---
    async getByEstablishment(req, res) {
        try {
            const { estId } = req.params;
            const subs = await Subscription.findByEstablishment(estId);
            res.status(200).json({ subscriptions: subs });
        } catch (err) {
            logger.error("Erreur getByEstablishment:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- UPDATE SUBSCRIPTION ---
    async update(req, res) {
        try {
            const { id } = req.params;
            const { plan, startDate, endDate, active } = req.body;
            const sub = await Subscription.findById(id);
            if (!sub) return res.status(404).json({ error: "Abonnement introuvable" });

            sub.plan = plan || sub.plan;
            sub.startDate = startDate || sub.startDate;
            sub.endDate = endDate || sub.endDate;
            sub.active = active !== undefined ? active : sub.active;

            const updated = await Subscription.update(id, {
                plan: sub.plan,
                startDate: sub.startDate,
                endDate: sub.endDate,
                active: sub.active
            });
            res.status(200).json({ subscription: updated });
        } catch (err) {
            logger.error("Erreur update subscription:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- DELETE SUBSCRIPTION ---
    async delete(req, res) {
        try {
            const { id } = req.params;
            await Subscription.delete(id);
            res.status(200).json({ message: "Abonnement supprimé" });
        } catch (err) {
            logger.error("Erreur delete subscription:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }
}

export default new SubscriptionsController();



