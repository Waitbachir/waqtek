import Video from '../models/video.model.js';
import Establishment from '../models/establishment.model.js';
import logger from '../core/logger.js';

class VideosController {
    static isAllowedTenant(req, establishmentId) {
        const isAdmin = req.user?.role === 'admin';
        if (isAdmin) return true;
        return !!req.tenant?.canAccessEstablishmentId?.(establishmentId);
    }

    static async getById(req, res) {
        try {
            const id = req.params.id;
            if (!id) {
                return res.status(400).json({ message: 'id manquant', error: 'id manquant' });
            }

            const video = await Video.getById(id);
            if (!video) {
                return res.status(404).json({ message: 'Video introuvable', error: 'Video introuvable' });
            }

            const establishmentId = video.establishment_id || video.establishmentId;
            if (!this.isAllowedTenant(req, establishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)', error: 'Acces refuse (tenant)' });
            }

            return res.status(200).json({ video });
        } catch (error) {
            logger.error('[VIDEOS] getById error:', error);
            return res.status(500).json({ message: error.message || 'Erreur serveur', error: 'Erreur serveur' });
        }
    }

    static async getByEstablishment(req, res) {
        try {
            const establishmentId = req.params.establishmentId;
            if (!establishmentId) {
                return res.status(400).json({ message: 'establishmentId manquant', error: 'establishmentId manquant' });
            }

            if (!this.isAllowedTenant(req, establishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)', error: 'Acces refuse (tenant)' });
            }

            const videos = await Video.getByEstablishment(establishmentId);
            return res.status(200).json({ videos: Array.isArray(videos) ? videos : [] });
        } catch (error) {
            logger.error('[VIDEOS] getByEstablishment error:', error);
            return res.status(500).json({ message: error.message || 'Erreur serveur', error: 'Erreur serveur' });
        }
    }

    static async create(req, res) {
        try {
            const establishmentId = req.body.establishment_id || req.body.establishmentId;
            const nom = String(req.body.nom || '').trim();
            const lien = String(req.body.lien || '').trim();

            if (!establishmentId || !nom || !lien) {
                return res.status(400).json({
                    message: 'establishment_id, nom et lien sont obligatoires',
                    error: 'establishment_id, nom et lien sont obligatoires'
                });
            }

            if (!this.isAllowedTenant(req, establishmentId)) {
                return res.status(403).json({ message: 'Acces refuse (tenant)', error: 'Acces refuse (tenant)' });
            }

            const establishment = await Establishment.findById(establishmentId);
            if (!establishment) {
                return res.status(404).json({ message: 'Etablissement introuvable', error: 'Etablissement introuvable' });
            }

            const video = await Video.create({
                establishment_id: establishmentId,
                nom,
                lien
            });

            if (!video) {
                return res.status(500).json({ message: 'Impossible de creer la video', error: 'Impossible de creer la video' });
            }

            return res.status(201).json({
                message: 'Video enregistree',
                video
            });
        } catch (error) {
            logger.error('[VIDEOS] create error:', error);
            return res.status(500).json({ message: error.message || 'Erreur serveur', error: 'Erreur serveur' });
        }
    }
}

export default VideosController;
