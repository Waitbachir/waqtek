import Establishment from '../models/establishment.model.js';
import logger from '../core/logger.js';

class EstablishmentsController {
    static async getAllPublic(req, res) {
        try {
            const ests = await Establishment.getAll();
            return res.status(200).json({ establishments: ests || [] });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Erreur serveur' });
        }
    }

    static async create(req, res) {
        try {
            const { name, address } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Le nom est obligatoire' });
            }

            const manager_id = req.user.id;
            const est = await Establishment.create({ name, address, manager_id });

            if (!est) {
                return res.status(500).json({ error: 'Erreur lors de la creation' });
            }

            return res.status(201).json({
                message: 'Etablissement cree',
                establishment: est
            });
        } catch (err) {
            logger.error('CREATE EST ERROR:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    static async getAll(req, res) {
        try {
            const isAdmin = req.tenant?.isAdmin === true || req.user?.role === 'admin';
            const ests = isAdmin
                ? await Establishment.getAll()
                : await Establishment.getByIds(req.tenant?.establishmentIds || []);
            return res.status(200).json({ establishments: ests });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        const est = await Establishment.findById(req.params.id);
        if (!est) return res.status(404).json({ error: 'Etablissement non trouve' });

        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && !req.tenant?.canAccessEstablishmentId?.(est.id)) {
            return res.status(403).json({ error: 'Acces refuse (tenant)' });
        }
        return res.status(200).json({ establishment: est });
    }

    static async update(req, res) {
        const est = await Establishment.findById(req.params.id);
        if (!est) return res.status(404).json({ error: 'Etablissement non trouve' });

        if (req.user?.role !== 'admin' && !req.tenant?.canAccessEstablishmentId?.(est.id)) {
            return res.status(403).json({ error: 'Acces refuse (tenant)' });
        }

        const updated = await Establishment.update(req.params.id, req.body);
        return res.status(200).json({ establishment: updated });
    }

    static async delete(req, res) {
        const est = await Establishment.findById(req.params.id);
        if (!est) return res.status(404).json({ error: 'Etablissement non trouve' });

        if (req.user?.role !== 'admin' && !req.tenant?.canAccessEstablishmentId?.(est.id)) {
            return res.status(403).json({ error: 'Acces refuse (tenant)' });
        }

        await Establishment.delete(req.params.id);
        return res.status(200).json({ message: 'Etablissement supprime' });
    }
}

export default EstablishmentsController;
