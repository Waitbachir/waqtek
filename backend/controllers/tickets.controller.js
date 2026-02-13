import logger from '../core/logger.js';

// tickets.controller.js
// Contrôleur des tickets WaQtek avec WebSocket + Notifications

import Ticket from '../models/ticket.model.js';
import Queue from '../models/queue.model.js';
import Establishment from '../models/establishment.model.js';
import realtime from '../services/realtime.service.js';
import notifications from '../services/notifications.service.js';
import supabase from '../services/supabase.service.js';
import esp32Service from '../services/esp32.service.js';
import cacheInvalidationService from '../services/cache-invalidation.service.js';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

function normalizeDeviceId(raw) {
    const value = String(raw || "").trim();
    return value.slice(0, 120);
}

function getQueueIdFromTicket(ticket) {
    return ticket?.queue_id || ticket?.queueId || ticket?.queueid || null;
}

function getLockedDeviceId(ticket) {
    const clientId = ticket?.client_id || ticket?.clientId || "";
    const str = String(clientId);
    if (str.startsWith("device:")) {
        return str.slice("device:".length);
    }
    return null;
}

const remoteAccessByTicket = new Map();
const remoteAccessByToken = new Map();

function buildFrontendBaseUrl(req) {
    const fromEnv = String(process.env.FRONTEND_BASE_URL || '').trim();
    if (fromEnv) return fromEnv.replace(/\/+$/, '');
    const origin = String(req.headers.origin || '').trim();
    if (origin) return origin.replace(/\/+$/, '');
    const referer = String(req.headers.referer || '').trim();
    if (referer) {
        try {
            const u = new URL(referer);
            return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
        } catch (_) {}
    }
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
    const hostHeader = String(req.headers.host || 'localhost:5000');
    const host = hostHeader.replace(/:5000$/, ':3000');
    return `${protocol}://${host}`.replace(/\/+$/, '');
}

function createRemoteToken() {
    return randomBytes(24).toString('hex');
}

function clearRemoteSession(ticketId, token) {
    if (ticketId) remoteAccessByTicket.delete(String(ticketId));
    if (token) remoteAccessByToken.delete(String(token));
}

class TicketsController {

    async getPublicPaymentStatus(req, res) {
        try {
            const { ticketId } = req.params;
            if (!ticketId) {
                return res.status(400).json({ error: "ticketId manquant" });
            }

            const payment = await esp32Service.getPaymentStatus(ticketId);

            return res.status(200).json({
                ticketId,
                payment
            });
        } catch (err) {
            logger.error("Erreur payment status :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async activateRemoteAccess(req, res) {
        try {
            const { ticketId } = req.body || {};
            if (!ticketId) return res.status(400).json({ error: "ticketId manquant" });

            const ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });

            const payment = await esp32Service.getPaymentStatus(ticketId);
            if (!(payment?.confirmed === true || payment?.status === "paid")) {
                return res.status(409).json({
                    error: "PAYMENT_NOT_CONFIRMED",
                    payment
                });
            }

            const status = String(ticket.status || "").toLowerCase();
            if (status !== "waiting") {
                return res.status(409).json({
                    error: "TICKET_NOT_WAITING",
                    status
                });
            }

            const existing = remoteAccessByTicket.get(String(ticketId));
            if (existing) {
                const trackingUrl = `${buildFrontendBaseUrl(req)}/client/remote-tracking.html?token=${encodeURIComponent(existing.token)}`;
                return res.status(200).json({
                    message: "Remote access already active",
                    ticket,
                    remoteAccess: {
                        token: existing.token,
                        trackingUrl,
                        claimed: !!existing.claimedDeviceId,
                        claimedDeviceId: existing.claimedDeviceId || null
                    }
                });
            }

            const token = createRemoteToken();
            const session = {
                ticketId: String(ticketId),
                token,
                claimedDeviceId: null,
                activatedAt: new Date().toISOString()
            };
            remoteAccessByTicket.set(String(ticketId), session);
            remoteAccessByToken.set(token, session);

            const trackingUrl = `${buildFrontendBaseUrl(req)}/client/remote-tracking.html?token=${encodeURIComponent(token)}`;
            return res.status(200).json({
                message: "Remote access active",
                ticket,
                remoteAccess: {
                    token,
                    trackingUrl,
                    claimed: false
                }
            });
        } catch (err) {
            logger.error("Erreur activate remote access :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async claimRemoteAccess(req, res) {
        try {
            const { token, id_device: idDeviceRaw, deviceId: deviceIdRaw } = req.body || {};
            const idDevice = normalizeDeviceId(idDeviceRaw || deviceIdRaw);

            if (!token) return res.status(400).json({ error: "token manquant" });
            if (!idDevice) return res.status(400).json({ error: "id_device manquant" });

            const session = remoteAccessByToken.get(String(token));
            if (!session) return res.status(404).json({ error: "TOKEN_INVALID" });

            const ticket = await Ticket.findById(session.ticketId);
            if (!ticket) {
                clearRemoteSession(session.ticketId, token);
                return res.status(404).json({ error: "Ticket introuvable" });
            }

            const status = String(ticket.status || "").toLowerCase();
            if (status !== "waiting") {
                clearRemoteSession(session.ticketId, token);
                return res.status(409).json({
                    error: "TOKEN_EXPIRED",
                    status
                });
            }

            if (!session.claimedDeviceId) {
                session.claimedDeviceId = idDevice;
                session.claimedAt = new Date().toISOString();
            } else if (session.claimedDeviceId !== idDevice) {
                return res.status(403).json({
                    error: "DEVICE_NOT_ALLOWED",
                    message: "Ce ticket est deja lie a un autre appareil"
                });
            }

            return res.status(200).json({
                message: "Remote access claimed",
                ticketId: session.ticketId,
                id_device: idDevice
            });
        } catch (err) {
            logger.error("Erreur claim remote access :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async getRemoteAccessPosition(req, res) {
        try {
            const token = String(req.query.token || "").trim();
            const idDevice = normalizeDeviceId(req.query.id_device || req.query.deviceId);

            if (!token) return res.status(400).json({ error: "token manquant" });
            if (!idDevice) return res.status(400).json({ error: "id_device manquant" });

            const session = remoteAccessByToken.get(token);
            if (!session) return res.status(404).json({ error: "TOKEN_INVALID" });

            if (!session.claimedDeviceId) {
                return res.status(403).json({
                    error: "TOKEN_NOT_CLAIMED",
                    message: "Le QR code doit etre active depuis un smartphone"
                });
            }

            if (session.claimedDeviceId !== idDevice) {
                return res.status(403).json({
                    error: "DEVICE_NOT_ALLOWED",
                    message: "Ce ticket est deja lie a un autre appareil"
                });
            }

            const ticket = await Ticket.findById(session.ticketId);
            if (!ticket) {
                clearRemoteSession(session.ticketId, token);
                return res.status(404).json({ error: "Ticket introuvable" });
            }

            const status = String(ticket.status || "").toLowerCase();
            if (status !== "waiting") {
                clearRemoteSession(session.ticketId, token);
                return res.status(409).json({
                    error: "POSITION_ONLY_WHEN_WAITING",
                    status
                });
            }

            const queueId = getQueueIdFromTicket(ticket);
            if (!queueId) {
                return res.status(500).json({ error: "queue_id introuvable sur le ticket" });
            }

            const queueTickets = await Ticket.findByQueue(queueId);
            const waitingTickets = (Array.isArray(queueTickets) ? queueTickets : [])
                .filter((t) => String(t.status || "").toLowerCase() === "waiting")
                .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

            const position = waitingTickets.findIndex((t) => String(t.id) === String(ticket.id)) + 1;

            return res.status(200).json({
                ticketId: ticket.id,
                ticketNumber: ticket.number,
                queueId,
                status,
                position: position > 0 ? position : null,
                waitingCount: waitingTickets.length,
                id_device: idDevice
            });
        } catch (err) {
            logger.error("Erreur get remote access position :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async getPublicPosition(req, res) {
        try {
            const { ticketId } = req.params;
            const idDevice = normalizeDeviceId(req.query.id_device || req.query.deviceId);

            if (!ticketId) return res.status(400).json({ error: "ticketId manquant" });
            if (!idDevice) return res.status(400).json({ error: "id_device manquant" });

            const ticket = await Ticket.findById(ticketId);
            if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });

            const status = String(ticket.status || "").toLowerCase();
            if (status !== "waiting") {
                return res.status(409).json({
                    error: "POSITION_ONLY_WHEN_WAITING",
                    status
                });
            }

            const lockedDevice = getLockedDeviceId(ticket);
            if (!lockedDevice) {
                return res.status(403).json({
                    error: "REMOTE_NOT_ACTIVATED",
                    message: "L'acces distant n'est pas encore active pour ce ticket"
                });
            }

            if (lockedDevice !== idDevice) {
                return res.status(403).json({
                    error: "DEVICE_NOT_ALLOWED",
                    message: "Ce ticket est deja lie a un autre appareil"
                });
            }

            const queueId = getQueueIdFromTicket(ticket);
            if (!queueId) {
                return res.status(500).json({ error: "queue_id introuvable sur le ticket" });
            }

            const queueTickets = await Ticket.findByQueue(queueId);
            const waitingTickets = (Array.isArray(queueTickets) ? queueTickets : [])
                .filter((t) => String(t.status || "").toLowerCase() === "waiting")
                .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

            const position = waitingTickets.findIndex((t) => String(t.id) === String(ticketId)) + 1;

            return res.status(200).json({
                ticketId,
                queueId,
                status,
                position: position > 0 ? position : null,
                waitingCount: waitingTickets.length,
                id_device: idDevice
            });
        } catch (err) {
            logger.error("Erreur get public position :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async createPosPublic(req, res) {
        try {
            const { queueId } = req.body;
            const deviceId = String(
                req.body.device_id || req.body.deviceId || req.body.id_device || "unknown-pos-device"
            );
            const remoteAccess = Boolean(
                req.body.remoteAccess ?? req.body.withRemoteAccess ?? req.body.vip ?? false
            );

            if (!queueId) return res.status(400).json({ error: "queueId manquant" });

            const queue = await Queue.findById(queueId);
            if (!queue) return res.status(404).json({ error: "Queue introuvable" });

            const establishmentId =
                queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? null;
            const establishment = establishmentId
                ? await Establishment.findById(establishmentId)
                : null;

            let ticketNumber = 1;
            try {
                const lastTickets = await Ticket.findByQueue(queue.id);
                if (Array.isArray(lastTickets) && lastTickets.length > 0) {
                    const numbers = lastTickets
                        .map((t) => parseInt(t.number, 10) || 0)
                        .filter((n) => n > 0);
                    if (numbers.length > 0) ticketNumber = Math.max(...numbers) + 1;
                }
            } catch (e) {
                logger.error("Erreur generation numero ticket POS:", e);
            }

            const nowIso = new Date().toISOString();
            const espPayload = {
                etablissement: establishment?.name || establishmentId || "",
                queue: queue.name || queue.id || "",
                date: nowIso
            };

            let esp32Result;
            if (remoteAccess) {
                // Compatibility mode for existing ESP32 firmware UX:
                // create ticket first so ESP32 receives real id_ticket and can show "confirm payment".
                const requirePreConfirm = String(process.env.ESP32_VIP_REQUIRE_PRECONFIRM || "false").toLowerCase() === "true";
                let ticket;
                let paymentResult = null;

                if (requirePreConfirm) {
                    const incomingTransactionId = String(req.body.transaction_id || "").trim() || undefined;
                    paymentResult = await esp32Service.processVipPaymentWithTicket({
                        transaction_id: incomingTransactionId,
                        device_id: deviceId,
                        establishment_id: establishmentId,
                        amount: 50,
                        payload: {
                            etablissement: espPayload.etablissement,
                            queue: espPayload.queue,
                            date: espPayload.date
                        },
                        createTicket: async () =>
                            await Ticket.create({
                                queueId: queue.id,
                                establishmentId,
                                clientId: uuidv4(),
                                number: ticketNumber.toString(),
                                status: "waiting"
                            })
                    });

                    if (!paymentResult?.confirmed || !paymentResult?.ticket) {
                        const duplicate = paymentResult?.ignored && paymentResult?.status === "CONFIRMED";
                        if (duplicate) {
                            const existingTicket = paymentResult?.ticket_id
                                ? await Ticket.findById(paymentResult.ticket_id)
                                : null;
                            return res.status(200).json({
                                message: "Transaction deja traitee",
                                ticket: existingTicket || paymentResult.ticket || null,
                                remoteAccess,
                                paymentRequired: true,
                                paymentAmount: 50,
                                esp32: paymentResult
                            });
                        }
                        const esp32SendFailed =
                            paymentResult?.error === "ESP32_SEND_FAILED" ||
                            paymentResult?.esp32?.sent === false;
                        const timeout =
                            paymentResult?.confirmation?.reason === "confirmation_timeout" ||
                            paymentResult?.error === "PAYMENT_NOT_CONFIRMED";

                        const errorCode = esp32SendFailed
                            ? "ESP32_SEND_FAILED"
                            : timeout
                                ? "PAYMENT_CONFIRMATION_TIMEOUT"
                                : "PAYMENT_NOT_CONFIRMED";
                        const statusCode = esp32SendFailed ? 502 : 402;

                        logger.warn("VIP payment not confirmed in POS create", {
                            errorCode,
                            queueId: queue.id,
                            deviceId,
                            remoteAccess,
                            transaction_id: paymentResult?.transaction_id || null,
                            esp32_status: paymentResult?.esp32?.status || null,
                            esp32_error: paymentResult?.esp32?.error || null,
                            confirmation_status: paymentResult?.confirmation?.status || null,
                            confirmation_reason: paymentResult?.confirmation?.reason || null
                        });

                        return res.status(statusCode).json({
                            error: errorCode,
                            payment: paymentResult
                        });
                    }

                    ticket = paymentResult.ticket;
                    esp32Result = paymentResult;
                } else {
                    ticket = await Ticket.create({
                        queueId: queue.id,
                        establishmentId,
                        clientId: uuidv4(),
                        number: ticketNumber.toString(),
                        status: "waiting"
                    });

                    if (!ticket) {
                        return res.status(500).json({ error: "Impossible de creer le ticket POS" });
                    }

                    esp32Result = await esp32Service.functionVIP({
                        ...espPayload,
                        id_ticket: ticket.id,
                        numero_ticket: ticket.number,
                        device_id: deviceId,
                        payment_status: "PENDING"
                    });

                    if (esp32Result?.sent === false) {
                        logger.warn("VIP ESP32 send failed after ticket creation", {
                            queueId: queue.id,
                            ticketId: ticket.id,
                            deviceId,
                            esp32_status: esp32Result?.status || null,
                            esp32_error: esp32Result?.error || null
                        });
                    }
                }

                try { realtime.newTicket(queue.id, ticket); } catch (_) {}
                try { realtime.queueUpdated(queue.id, queue); } catch (_) {}
                try { notifications.notifyNewTicket(queue.id, ticket); } catch (_) {}
                try { await cacheInvalidationService.invalidateOnTicketMutation(); } catch (_) {}

                return res.status(201).json({
                    message: "Ticket POS cree avec succes",
                    ticket,
                    remoteAccess,
                    paymentRequired: true,
                    paymentAmount: 50,
                    esp32: esp32Result
                });
            } else {
                const ticket = await Ticket.create({
                    queueId: queue.id,
                    establishmentId,
                    clientId: uuidv4(),
                    number: ticketNumber.toString(),
                    status: "waiting"
                });

                if (!ticket) {
                    return res.status(500).json({ error: "Impossible de creer le ticket POS" });
                }

                try { realtime.newTicket(queue.id, ticket); } catch (_) {}
                try { realtime.queueUpdated(queue.id, queue); } catch (_) {}
                try { notifications.notifyNewTicket(queue.id, ticket); } catch (_) {}
                try { await cacheInvalidationService.invalidateOnTicketMutation(); } catch (_) {}

                esp32Result = await esp32Service.functionPST({
                    ...espPayload,
                    id_ticket: ticket.id,
                    numero_ticket: ticket.number
                });
                return res.status(201).json({
                    message: "Ticket POS cree avec succes",
                    ticket,
                    remoteAccess,
                    paymentRequired: false,
                    paymentAmount: 0,
                    esp32: esp32Result
                });
            }
        } catch (err) {
            logger.error("Erreur create POS ticket :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- 🔹 Création d'un ticket ---
    async create(req, res) {
    try {
        let { queueId, clientId, } = req.body; // clientId obligatoire pour limiter à 1 ticket

        if (!queueId) return res.status(400).json({ error: "queueId manquant" });
        if (!clientId) {
            // Générer un UUID si clientId manquant
            clientId = uuidv4();
        } else {
            // Si clientId est fourni mais pas un UUID, le traiter comme un alias et générer un UUID
            // Pour respecter le schéma Supabase
            if (!clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                clientId = uuidv4();
            }
        }

        // 1️⃣ Vérifier si la file existe
        const queue = await Queue.findById(queueId);
        if (!queue) return res.status(404).json({ error: "Queue introuvable" });
        const queueEstablishmentId = String(queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? "");
        if (req.user && req.user?.role !== "admin" && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
            return res.status(403).json({ error: "Acces refuse (tenant)" });
        }

        // 2️⃣ Vérifier si le client a déjà un ticket ACTIF dans CETTE QUEUE
const existingTickets = await Ticket.getByClientAndQueue(clientId, queueId);

const activeTicket = existingTickets?.find(t =>
    t.status === "waiting" || t.status === "called"
);

if (activeTicket) {
    return res.status(409).json({
        error: "TICKET_ALREADY_EXISTS",
        ticket: activeTicket
    });
}


        // 3️⃣ Génération du numéro de ticket
        let ticketNumber = 1;
        
        try {
            // Récupérer le dernier numéro de ticket de la queue
            const lastTickets = await Ticket.findByQueue(queue.id);
            if (lastTickets && Array.isArray(lastTickets) && lastTickets.length > 0) {
                const numbers = lastTickets
                    .map(t => parseInt(t.number) || 0)
                    .filter(n => n > 0);
                if (numbers.length > 0) {
                    ticketNumber = Math.max(...numbers) + 1;
                }
            }
        } catch(e) {
            logger.error("Erreur génération numéro ticket:", e);
            // Continuer avec numéro 1 si erreur
        }

        const ticket = await Ticket.create({
            queueId: queue.id,
            establishmentId: queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? null,
            clientId,
            number: ticketNumber.toString(),
            status: "waiting"
        });

        logger.info("📝 Ticket creation result:", ticket);

        if (!ticket) {
            logger.error("❌ Ticket creation failed - returned null/falsy");
            return res.status(500).json({
                error: "Impossible de créer le ticket"
            });
        }



        // 5️⃣ Notifications et WebSocket (non bloquant)
        try { realtime.newTicket(queue.id, ticket); } catch(e) {}
        try { realtime.queueUpdated(queue.id, queue); } catch(e) {}
        try { notifications.notifyNewTicket(queue.id, ticket); } catch(e) {}
        try { await cacheInvalidationService.invalidateOnTicketMutation(); } catch (_) {}

        return res.status(201).json({
            message: "Ticket créé avec succès",
            ticket
        });

    } catch (err) {
        logger.error("Erreur create ticket :", err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
}


    // --- 🔹 Récupérer tous les tickets ---
    async getAll(req, res) {
        try {
            const isAdmin = req.user?.role === 'admin';
            let tickets = [];

            if (isAdmin) {
                tickets = await Ticket.findAll();
            } else {
                const estIds = req.tenant?.establishmentIds || [];
                const queues = await Queue.getByEstablishmentIds(estIds);
                const lists = await Promise.all(
                    queues.map((q) => Ticket.findByQueue(q.id))
                );
                tickets = lists.flat().filter(Boolean);
            }

            res.status(200).json({ tickets });
        } catch (err) {
            logger.error("Erreur getAll tickets:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    async getByQueue(req, res) {
        try {
            const queueId = req.params.queueId;
            const queue = await Queue.findById(queueId);
            if (!queue) return res.status(404).json({ error: "Queue introuvable" });

            const queueEstablishmentId = String(queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? "");
            if (req.user?.role !== "admin" && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ error: "Acces refuse (tenant)" });
            }

            const tickets = await Ticket.findByQueue(queueId);
            return res.status(200).json({ tickets });
        } catch (err) {
            logger.error("Erreur getByQueue:", err);
            return res.status(500).json({ message: err.message });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const ticket = await Ticket.findById(id);

            if (!ticket)
                return res.status(404).json({ error: "Ticket introuvable" });

            const queueId = ticket.queue_id || ticket.queueId || ticket.queueid;
            const queue = await Queue.findById(queueId);
            if (!queue) return res.status(404).json({ error: "Queue introuvable" });

            const queueEstablishmentId = String(queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? "");
            if (req.user?.role !== "admin" && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ error: "Acces refuse (tenant)" });
            }

            res.status(200).json({ ticket });

        } catch (err) {
            logger.error("Erreur getById:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }

    // --- ?? Mise ? jour du statut d?un ticket ---
    // --- ?? Mise ? jour du statut d?un ticket ---
async updateStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, counter } = req.body;

        logger.info("🔄 updateStatus called - id:", id, "status:", status);

        if (!status) {
            return res.status(400).json({ error: "Status est manquant" });
        }

        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json({ error: "Ticket introuvable" });
        }

        const queueId = ticket.queue_id || ticket.queueId || ticket.queueid;
        const queue = await Queue.findById(queueId);
        if (!queue) return res.status(404).json({ error: "Queue introuvable" });

        const queueEstablishmentId = String(queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? "");
        if (req.user?.role !== "admin" && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
            return res.status(403).json({ error: "Acces refuse (tenant)" });
        }

        logger.info("📋 Found ticket:", ticket);

        // Mise à jour du ticket
        let updatedTicket;
        try {
            const updatePayload = { status };
            if (typeof counter !== 'undefined') {
                updatePayload.counter = counter;
            }
            updatedTicket = await Ticket.update(id, updatePayload);
            logger.info("✏️  Updated ticket result:", updatedTicket);
        } catch(updateError) {
            logger.error("❌ Update failed:", updateError);
            return res.status(500).json({ error: "Erreur lors de la mise à jour: " + updateError.message });
        }

        if (!updatedTicket) {
            logger.error("❌ Ticket update returned null");
            return res.status(500).json({ error: "Impossible de mettre à jour le ticket" });
        }

        // 🔥 SI LE TICKET EST APPELÉ → METTRE À JOUR LA QUEUE
        if (status === "called") {
            try {
                const queueId = updatedTicket.queue_id || updatedTicket.queueId || updatedTicket.queueid;
                logger.info("📢 Ticket called for queue:", queueId);

                const queue = await Queue.findById(queueId);

                if (queue) {
                    await Queue.update(queue.id, {
                        currentticketnumber: updatedTicket.number
                    });

                    // 📡 TEMPS RÉEL (ÉCRAN / CLIENTS)
                    realtime.queueUpdated(queue.id, {
                        queueId: queue.id,
                        currentticketnumber: updatedTicket.number
                    });
                }

                try {
                    realtime.ticketCalled(queueId, updatedTicket);
                    notifications.notifyTicketCalled(updatedTicket);
                } catch(notifError) {
                    logger.warn("⚠️  Notification error (non-blocking):", notifError.message);
                }
            } catch(callError) {
                logger.error("❌ Error in call handling:", callError);
                // Ne pas retourner d'erreur car le ticket a quand même été mis à jour
            }
        }

        try { await cacheInvalidationService.invalidateOnTicketMutation(); } catch (_) {}

        return res.status(200).json({
            message: "Statut mis à jour",
            ticket: updatedTicket
        });

    } catch (err) {
        logger.error("❌ Erreur updateStatus ticket:", err);
        return res.status(500).json({ error: "Erreur serveur: " + err.message });
    }
}




    // --- 🔹 Suppression d’un ticket ---
    async delete(req, res) {
        try {
            const { id } = req.params;

            const ticket = await Ticket.findById(id);
            if (!ticket)
                return res.status(404).json({ error: "Ticket introuvable" });

            const queueId = ticket.queue_id || ticket.queueId || ticket.queueid;
            const queue = await Queue.findById(queueId);
            if (!queue) return res.status(404).json({ error: "Queue introuvable" });

            const queueEstablishmentId = String(queue.establishmentid ?? queue.establishment_id ?? queue.establishmentId ?? "");
            if (req.user?.role !== "admin" && !req.tenant?.canAccessEstablishmentId?.(queueEstablishmentId)) {
                return res.status(403).json({ error: "Acces refuse (tenant)" });
            }

            await Ticket.delete(id);
            try { await cacheInvalidationService.invalidateOnTicketMutation(); } catch (_) {}

            // Temps réel (optionnel)
            realtime.ticketStatusUpdated(ticket.queue_id || ticket.queueId || ticket.queueid, {
                id,
                deleted: true
            });

            return res.status(200).json({
                message: "Ticket supprimé"
            });

        } catch (err) {
            logger.error("Erreur delete ticket:", err);
            res.status(500).json({ error: "Erreur serveur" });
        }
    }
}

export default new TicketsController();

