import Device from '../models/device.model.js';
import { generateSecretKey } from '../core/crypto.util.js';
import Transaction from '../models/transaction.model.js';

const REGISTRATION_TOKEN_HEADER = 'x-registration-token';

class IotController {
    async generateUniqueDeviceId(prefix = 'esp32') {
        for (let i = 0; i < 5; i += 1) {
            const candidate = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            const exists = await Device.findByDeviceId(candidate);
            if (!exists) return candidate;
        }
        return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    }

    async generateUniqueSecretKey() {
        for (let i = 0; i < 5; i += 1) {
            const candidate = generateSecretKey();
            const exists = await Device.findBySecretKey(candidate);
            if (!exists) return candidate;
        }
        return generateSecretKey(48);
    }

    async registerDevice(req, res) {
        try {
            const providedToken = String(req.headers[REGISTRATION_TOKEN_HEADER] || '').trim();
            const expectedToken = String(process.env.IOT_REGISTRATION_TOKEN || '').trim();

            // Registration endpoint is protected by provisioning token.
            if (!expectedToken || providedToken !== expectedToken) {
                return res.status(403).json({
                    error: 'REGISTRATION_FORBIDDEN',
                    message: 'Token d\'enregistrement invalide'
                });
            }

            const { establishment_id } = req.body || {};
            if (!establishment_id) {
                return res.status(400).json({
                    error: 'INVALID_INPUT',
                    message: 'establishment_id est obligatoire'
                });
            }

            const providedDeviceId = String(req.body?.device_id || '').trim();
            const deviceId = providedDeviceId || await this.generateUniqueDeviceId();
            const existing = await Device.findByDeviceId(deviceId);
            if (existing) {
                return res.status(409).json({
                    error: 'DEVICE_ALREADY_REGISTERED',
                    device: {
                        device_id: existing.device_id,
                        establishment_id: existing.establishment_id,
                        active: !!existing.active
                    }
                });
            }

            const device = await Device.create({
                device_id: deviceId,
                establishment_id,
                secret_key: await this.generateUniqueSecretKey(),
                status: 'DISABLED',
                active: false,
                last_seen: null
            });

            if (!device) {
                return res.status(500).json({ error: 'Impossible de creer le device' });
            }

            return res.status(201).json({
                message: 'Device enregistre',
                device: {
                    device_id: device.device_id,
                    establishment_id: device.establishment_id,
                    secret_key: device.secret_key,
                    status: device.status || 'DISABLED',
                    last_seen: device.last_seen || null,
                    active: !!device.active
                }
            });
        } catch (error) {
            return res.status(500).json({
                error: 'REGISTER_DEVICE_ERROR',
                message: error.message || 'Erreur serveur'
            });
        }
    }

    async activateDevice(req, res) {
        try {
            // HMAC signature is verified by middleware and device is available on req.
            const activated = await Device.activate(req.device.device_id);
            if (!activated) {
                return res.status(404).json({ error: 'Device introuvable' });
            }

            return res.status(200).json({
                message: 'Device active',
                device: {
                    device_id: activated.device_id,
                    establishment_id: activated.establishment_id,
                    active: !!activated.active,
                    activated_at: activated.activated_at || null
                }
            });
        } catch (error) {
            return res.status(500).json({
                error: 'ACTIVATE_DEVICE_ERROR',
                message: error.message || 'Erreur serveur'
            });
        }
    }

    async reportPayment(req, res) {
        try {
            // Middleware enforce signed request; unknown/unsigned requests are blocked.
            const { transaction_id, ticket_id, amount, status } = req.body || {};

            if (!transaction_id || typeof amount === 'undefined' || !status) {
                return res.status(400).json({
                    error: 'INVALID_INPUT',
                    message: 'transaction_id, amount et status sont obligatoires'
                });
            }

            const existingTx = await Transaction.findByTransactionId(transaction_id);
            if (!existingTx) {
                return res.status(404).json({
                    error: 'TRANSACTION_NOT_FOUND',
                    message: 'Transaction introuvable'
                });
            }

            const normalized = String(status || '').toUpperCase();
            const normalizedStatus = (normalized === 'PAID' || normalized === 'CONFIRMED')
                ? 'CONFIRMED'
                : (normalized === 'FAILED' || normalized === 'DECLINED')
                    ? 'FAILED'
                    : 'PENDING';

            const updatePayload = {
                status: normalizedStatus,
                amount
            };
            if (typeof ticket_id !== 'undefined' && ticket_id !== null && String(ticket_id).trim() !== '') {
                updatePayload.ticket_id = ticket_id;
            }

            const updatedTx = await Transaction.updateByTransactionId(transaction_id, updatePayload);

            return res.status(200).json({
                message: 'Paiement IoT recu',
                data: {
                    transaction_id,
                    ticket_id,
                    amount,
                    status,
                    device_id: req.device.device_id,
                    establishment_id: req.device.establishment_id,
                    transaction_status: updatedTx?.status || normalizedStatus,
                    received_at: new Date().toISOString()
                }
            });
        } catch (error) {
            return res.status(500).json({
                error: 'REPORT_PAYMENT_ERROR',
                message: error.message || 'Erreur serveur'
            });
        }
    }

    async reportHeartbeat(req, res) {
        try {
            // Signed IoT request already validated by middleware.
            const payload = req.body || {};
            const updated = await Device.recordHeartbeat(req.device.device_id, payload);

            if (!updated) {
                return res.status(404).json({
                    error: 'DEVICE_NOT_FOUND',
                    message: 'Device introuvable'
                });
            }

            return res.status(200).json({
                message: 'Heartbeat recu',
                data: {
                    device_id: updated.device_id,
                    establishment_id: updated.establishment_id,
                    last_heartbeat_at: updated.last_heartbeat_at,
                    heartbeat_count: updated.heartbeat_count,
                    status: updated.last_status || 'OK',
                    server_time: new Date().toISOString()
                }
            });
        } catch (error) {
            return res.status(500).json({
                error: 'HEARTBEAT_ERROR',
                message: error.message || 'Erreur serveur'
            });
        }
    }
}

export default new IotController();
