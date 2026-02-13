import http from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import Transaction from '../models/transaction.model.js';
import transactionService from './transaction.service.js';

class Esp32Service {
    constructor() {
        this.baseUrl = (process.env.ESP32_SERVER_URL || '').replace(/\/+$/, '');
        this.pstPath = process.env.ESP32_FUNCTION_PST_PATH || '/function_PST';
        this.vipPath = process.env.ESP32_FUNCTION_VIP_PATH || '/function_VIP';
        this.eventsPath = process.env.ESP32_EVENTS_PATH || '/events';
        this.timeoutMs = Number(process.env.ESP32_TIMEOUT_MS || 5000);
        this.maxRetries = Number(process.env.ESP32_RETRY_MAX || 3);
        this.retryDelayMs = Number(process.env.ESP32_RETRY_DELAY_MS || 800);
        this.confirmationPolls = Number(process.env.ESP32_CONFIRMATION_POLLS || 30);
        this.confirmationIntervalMs = Number(process.env.ESP32_CONFIRMATION_INTERVAL_MS || 1000);
    }

    hasConfig() {
        return !!this.baseUrl;
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async postWithNodeHttp(urlString, payload) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(urlString);
                const isHttps = parsed.protocol === 'https:';
                const transport = isHttps ? https : http;
                const body = JSON.stringify(payload);

                const req = transport.request(
                    {
                        protocol: parsed.protocol,
                        hostname: parsed.hostname,
                        port: parsed.port || (isHttps ? 443 : 80),
                        path: `${parsed.pathname}${parsed.search || ''}`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(body)
                        },
                        timeout: this.timeoutMs
                    },
                    (res) => {
                        let raw = '';
                        res.on('data', (chunk) => {
                            raw += chunk;
                        });
                        res.on('end', () => {
                            let data = null;
                            try {
                                data = raw ? JSON.parse(raw) : null;
                            } catch (_) {
                                data = raw || null;
                            }
                            resolve({
                                sent: res.statusCode >= 200 && res.statusCode < 300,
                                status: res.statusCode,
                                data
                            });
                        });
                    }
                );

                req.on('timeout', () => {
                    req.destroy(new Error('ESP32 timeout'));
                });

                req.on('error', (error) => {
                    resolve({
                        sent: false,
                        error: error.message || 'ESP32 request failed'
                    });
                });

                req.write(body);
                req.end();
            } catch (error) {
                resolve({
                    sent: false,
                    error: error.message || 'ESP32 request failed'
                });
            }
        });
    }

    async post(path, payload) {
        if (!this.hasConfig()) {
            return { sent: false, skipped: true, reason: 'ESP32_SERVER_URL non configure' };
        }

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        if (typeof fetch !== 'function') {
            return this.postWithNodeHttp(url, payload);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            let data = null;
            try {
                data = await response.json();
            } catch (_) {
                data = null;
            }

            return {
                sent: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            clearTimeout(timeout);
            return {
                sent: false,
                error: error.message || 'ESP32 request failed'
            };
        }
    }

    async getWithNodeHttp(urlString) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(urlString);
                const isHttps = parsed.protocol === 'https:';
                const transport = isHttps ? https : http;

                const req = transport.request(
                    {
                        protocol: parsed.protocol,
                        hostname: parsed.hostname,
                        port: parsed.port || (isHttps ? 443 : 80),
                        path: `${parsed.pathname}${parsed.search || ''}`,
                        method: 'GET',
                        timeout: this.timeoutMs
                    },
                    (res) => {
                        let raw = '';
                        res.on('data', (chunk) => {
                            raw += chunk;
                        });
                        res.on('end', () => {
                            let data = null;
                            try {
                                data = raw ? JSON.parse(raw) : null;
                            } catch (_) {
                                data = raw || null;
                            }
                            resolve({
                                ok: res.statusCode >= 200 && res.statusCode < 300,
                                status: res.statusCode,
                                data
                            });
                        });
                    }
                );

                req.on('timeout', () => {
                    req.destroy(new Error('ESP32 timeout'));
                });

                req.on('error', (error) => {
                    resolve({
                        ok: false,
                        error: error.message || 'ESP32 request failed'
                    });
                });

                req.end();
            } catch (error) {
                resolve({
                    ok: false,
                    error: error.message || 'ESP32 request failed'
                });
            }
        });
    }

    async get(path) {
        if (!this.hasConfig()) {
            return { ok: false, skipped: true, reason: 'ESP32_SERVER_URL non configure' };
        }

        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        if (typeof fetch !== 'function') {
            return this.getWithNodeHttp(url);
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);

            let data = null;
            try {
                data = await response.json();
            } catch (_) {
                data = null;
            }

            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            clearTimeout(timeout);
            return {
                ok: false,
                error: error.message || 'ESP32 request failed'
            };
        }
    }

    async getEvents() {
        return this.get(this.eventsPath);
    }

    extractTransactionStatusFromEvent(event) {
        const raw = String(event?.payment_status || event?.status || '').toUpperCase();
        if (raw === 'PAID' || raw === 'CONFIRMED') return { confirmed: true, status: 'CONFIRMED' };
        if (raw === 'FAILED' || raw === 'DECLINED') return { confirmed: false, status: 'FAILED' };
        if (raw === 'PENDING') return { confirmed: false, status: 'PENDING' };
        return null;
    }

    extractTransactionStatusFromResponse(payload) {
        const raw = String(
            payload?.payment_status
            || payload?.status
            || payload?.transaction_status
            || payload?.state
            || ''
        ).toUpperCase();

        if (raw === 'PAID' || raw === 'CONFIRMED' || raw === 'SUCCESS') {
            return { confirmed: true, status: 'CONFIRMED', source: 'esp32_response' };
        }

        if (raw === 'FAILED' || raw === 'DECLINED' || raw === 'ERROR') {
            return { confirmed: false, status: 'FAILED', source: 'esp32_response' };
        }

        if (raw === 'PENDING') {
            return { confirmed: false, status: 'PENDING', source: 'esp32_response' };
        }

        return null;
    }

    async getTransactionStatusFromDb(transactionId) {
        if (!transactionId) {
            return { confirmed: false, status: 'UNKNOWN', reason: 'transactionId manquant' };
        }

        const tx = await Transaction.findByTransactionId(transactionId);
        if (!tx) {
            return { confirmed: false, status: 'UNKNOWN', reason: 'transaction_not_found' };
        }

        const status = String(tx.status || '').toUpperCase();
        if (status === 'CONFIRMED') {
            return { confirmed: true, status: 'CONFIRMED', source: 'transaction_db' };
        }
        if (status === 'FAILED') {
            return { confirmed: false, status: 'FAILED', source: 'transaction_db' };
        }
        if (status === 'PENDING') {
            return { confirmed: false, status: 'PENDING', source: 'transaction_db' };
        }

        return { confirmed: false, status: 'UNKNOWN', source: 'transaction_db' };
    }

    async getTransactionStatus(transactionId) {
        if (!transactionId) {
            return { confirmed: false, status: 'UNKNOWN', reason: 'transactionId manquant' };
        }

        const eventsResponse = await this.getEvents();
        if (!eventsResponse.ok) {
            return {
                confirmed: false,
                status: 'UNKNOWN',
                esp32: eventsResponse
            };
        }

        const events = eventsResponse?.data?.events;
        if (!Array.isArray(events)) {
            return {
                confirmed: false,
                status: 'UNKNOWN',
                esp32: eventsResponse
            };
        }

        const matches = events.filter(
            (e) =>
                String(e?.transaction_id || e?.transactionId || e?.id_ticket || '') === String(transactionId)
        );

        for (let i = matches.length - 1; i >= 0; i -= 1) {
            const parsed = this.extractTransactionStatusFromEvent(matches[i]);
            if (parsed) {
                return { ...parsed, source: 'esp32_events' };
            }
        }

        return { confirmed: false, status: 'PENDING', source: 'esp32_events' };
    }

    async waitTransactionConfirmation(transactionId) {
        for (let attempt = 1; attempt <= this.confirmationPolls; attempt += 1) {
            const dbStatus = await this.getTransactionStatusFromDb(transactionId);
            if (dbStatus.status === 'CONFIRMED' || dbStatus.status === 'FAILED') {
                return { ...dbStatus, polls: attempt };
            }

            const espStatus = await this.getTransactionStatus(transactionId);
            if (espStatus.status === 'CONFIRMED' || espStatus.status === 'FAILED') {
                return { ...espStatus, polls: attempt };
            }

            if (attempt < this.confirmationPolls) {
                await this.sleep(this.confirmationIntervalMs);
            }
        }

        return { confirmed: false, status: 'PENDING', reason: 'confirmation_timeout' };
    }

    async postWithRetry(path, payload) {
        let lastResult = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
            const result = await this.post(path, payload);
            lastResult = { ...result, attempt };
            if (result.sent) {
                return lastResult;
            }
            if (attempt < this.maxRetries) {
                await this.sleep(this.retryDelayMs * attempt);
            }
        }

        return lastResult || { sent: false, error: 'ESP32 request failed', attempt: this.maxRetries };
    }

    async processVipPayment({ device_id, amount, payload = {} }) {
        const transaction_id = payload.transaction_id || randomUUID();
        const deviceId = String(device_id || payload.id_device || 'unknown-device');
        const establishmentId = payload.establishment_id || payload.establishmentId || null;

        const pendingState = await transactionService.createPendingIfNeeded({
            transaction_id,
            device_id: deviceId,
            establishment_id: establishmentId,
            amount,
        });

        if (!pendingState?.transaction) {
            return {
                confirmed: false,
                status: 'FAILED',
                error: 'TRANSACTION_CREATE_FAILED',
                transaction_id
            };
        }

        if (pendingState.isFinal) {
            return {
                confirmed: pendingState.transaction.status === 'CONFIRMED',
                status: pendingState.transaction.status,
                transaction_id,
                ignored: true,
                reason: 'TRANSACTION_ALREADY_FINAL',
                transaction: pendingState.transaction
            };
        }

        const requestPayload = {
            ...payload,
            transaction_id,
            // ESP32 firmware VIP flow identifies payments by id_ticket.
            id_ticket: String(transaction_id),
            amount,
            device_id: deviceId,
            payment_status: 'PENDING'
        };

        const sendResult = await this.postWithRetry(this.vipPath, requestPayload);
        if (!sendResult?.sent) {
            await transactionService.markFailed(transaction_id, sendResult?.error || 'ESP32_SEND_FAILED');
            return {
                confirmed: false,
                status: 'FAILED',
                transaction_id,
                esp32: sendResult
            };
        }

        const immediate = this.extractTransactionStatusFromResponse(sendResult?.data);
        let confirmation = immediate;
        if (!confirmation || confirmation.status === 'PENDING') {
            confirmation = await this.waitTransactionConfirmation(transaction_id);
        }

        const confirmedStatus = String(confirmation?.status || 'PENDING').toUpperCase();
        if (confirmedStatus === 'FAILED') {
            await transactionService.markFailed(transaction_id, 'ESP32_PAYMENT_FAILED');
        } else {
            await Transaction.updateByTransactionId(transaction_id, {
                status: confirmedStatus
            });
        }

        return {
            confirmed: confirmedStatus === 'CONFIRMED',
            status: confirmedStatus,
            transaction_id,
            esp32: sendResult,
            confirmation
        };
    }

    async processVipPaymentWithTicket({
        transaction_id,
        device_id,
        establishment_id,
        amount,
        payload = {},
        createTicket
    }) {
        const txId = transaction_id || payload.transaction_id || randomUUID();
        const deviceId = String(device_id || payload.id_device || 'unknown-device');

        const pendingState = await transactionService.createPendingIfNeeded({
            transaction_id: txId,
            device_id: deviceId,
            establishment_id: establishment_id || payload.establishment_id || payload.establishmentId || null,
            amount
        });

        if (!pendingState?.transaction) {
            return {
                confirmed: false,
                status: 'FAILED',
                transaction_id: txId,
                error: 'TRANSACTION_CREATE_FAILED'
            };
        }

        const existing = pendingState.transaction;
        if (pendingState.isFinal) {
            return {
                confirmed: existing.status === 'CONFIRMED',
                status: existing.status,
                transaction_id: txId,
                ticket_id: existing.ticket_id || null,
                ignored: true,
                reason: 'TRANSACTION_ALREADY_PROCESSED',
                transaction: existing
            };
        }

        const sendResult = await this.postWithRetry(this.vipPath, {
            ...payload,
            transaction_id: txId,
            // Compatibility with current ESP32 firmware: VIP requires id_ticket.
            id_ticket: String(txId),
            amount,
            device_id: deviceId,
            payment_status: 'PENDING'
        });

        if (!sendResult?.sent) {
            await transactionService.markFailed(txId, sendResult?.error || 'ESP32_SEND_FAILED');
            return {
                confirmed: false,
                status: 'FAILED',
                transaction_id: txId,
                esp32: sendResult
            };
        }

        const immediate = this.extractTransactionStatusFromResponse(sendResult?.data);
        let confirmation = immediate;
        if (!confirmation || confirmation.status === 'PENDING') {
            confirmation = await this.waitTransactionConfirmation(txId);
        }

        if (String(confirmation?.status || '').toUpperCase() !== 'CONFIRMED') {
            await transactionService.markFailed(txId, 'PAYMENT_NOT_CONFIRMED');
            return {
                confirmed: false,
                status: 'FAILED',
                transaction_id: txId,
                esp32: sendResult,
                confirmation
            };
        }

        const ticketResult = await transactionService.executeWithRetry('CREATE_TICKET', async () => {
            const ticket = await createTicket();
            if (!ticket?.id) {
                throw new Error('TICKET_CREATE_FAILED');
            }
            return ticket;
        });

        if (!ticketResult.ok) {
            await transactionService.markFailed(txId, ticketResult.error || 'TICKET_CREATE_FAILED');
            return {
                confirmed: false,
                status: 'FAILED',
                transaction_id: txId,
                esp32: sendResult,
                confirmation,
                error: ticketResult.error || 'TICKET_CREATE_FAILED'
            };
        }

        const ticket = ticketResult.value;
        await transactionService.markConfirmed(txId, ticket.id);

        return {
            confirmed: true,
            status: 'CONFIRMED',
            transaction_id: txId,
            ticket_id: ticket.id,
            ticket,
            esp32: sendResult,
            confirmation
        };
    }

    async attachTransactionToTicket(transactionId, ticketId) {
        if (!transactionId || !ticketId) return null;
        return await Transaction.updateByTransactionId(transactionId, { ticket_id: ticketId });
    }

    async getPaymentStatus(ticketId) {
        if (!ticketId) {
            return { confirmed: false, status: 'unknown', reason: 'ticketId manquant' };
        }

        const eventsResponse = await this.getEvents();
        if (!eventsResponse.ok) {
            return {
                confirmed: false,
                status: 'unknown',
                esp32: eventsResponse
            };
        }

        const events = eventsResponse?.data?.events;
        if (!Array.isArray(events)) {
            return {
                confirmed: false,
                status: 'unknown',
                esp32: eventsResponse
            };
        }

        const matches = events.filter((e) => String(e?.id_ticket || '') === String(ticketId));
        for (let i = matches.length - 1; i >= 0; i -= 1) {
            const paymentStatus = String(matches[i]?.payment_status || '').toUpperCase();
            if (paymentStatus === 'PAID') {
                return { confirmed: true, status: 'paid', source: 'esp32_events' };
            }
            if (paymentStatus === 'PENDING') {
                return { confirmed: false, status: 'pending', source: 'esp32_events' };
            }
        }

        return { confirmed: false, status: 'pending', source: 'esp32_events' };
    }

    async functionPST(payload) {
        return this.post(this.pstPath, payload);
    }

    async functionVIP(payload) {
        return this.post(this.vipPath, payload);
    }
}

export default new Esp32Service();
