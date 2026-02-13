import Transaction from '../models/transaction.model.js';

const FINAL_STATUSES = new Set(['CONFIRMED', 'FAILED']);

class TransactionService {
    constructor() {
        this.serverRetryMax = Number(process.env.SERVER_RETRY_MAX || 3);
        this.serverRetryDelayMs = Number(process.env.SERVER_RETRY_DELAY_MS || 250);
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    normalizeStatus(status) {
        const value = String(status || '').toUpperCase();
        if (value === 'CONFIRMED' || value === 'FAILED' || value === 'PENDING') return value;
        return 'PENDING';
    }

    isFinal(status) {
        return FINAL_STATUSES.has(this.normalizeStatus(status));
    }

    async executeWithRetry(task, fn) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.serverRetryMax; attempt += 1) {
            try {
                const value = await fn(attempt);
                return { ok: true, value, attempt };
            } catch (error) {
                lastError = error;
                if (attempt < this.serverRetryMax) {
                    await this.sleep(this.serverRetryDelayMs * attempt);
                }
            }
        }

        return {
            ok: false,
            error: lastError?.message || `${task}_FAILED`,
            attempt: this.serverRetryMax
        };
    }

    async createPendingIfNeeded({ transaction_id, device_id, establishment_id, amount }) {
        const existing = await Transaction.findByTransactionId(transaction_id);
        if (existing) {
            return {
                transaction: existing,
                alreadyExists: true,
                isFinal: this.isFinal(existing.status)
            };
        }

        const created = await Transaction.create({
            transaction_id,
            device_id,
            establishment_id,
            amount,
            status: 'PENDING',
            ticket_id: null
        });

        return {
            transaction: created,
            alreadyExists: false,
            isFinal: false
        };
    }

    async markFailed(transaction_id, reason = null) {
        return await Transaction.updateByTransactionId(transaction_id, {
            status: 'FAILED',
            error_reason: reason || null
        });
    }

    async markConfirmed(transaction_id, ticket_id) {
        return await Transaction.updateByTransactionId(transaction_id, {
            status: 'CONFIRMED',
            ticket_id
        });
    }
}

export default new TransactionService();

