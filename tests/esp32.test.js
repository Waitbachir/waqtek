import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const esp32Service = (await import('../backend/services/esp32.service.js')).default;
const Transaction = (await import('../backend/models/transaction.model.js')).default;

test('postWithRetry retries until success', async () => {
    const originalPost = esp32Service.post;
    const originalRetries = esp32Service.maxRetries;
    const originalDelay = esp32Service.retryDelayMs;

    try {
        let calls = 0;
        esp32Service.maxRetries = 3;
        esp32Service.retryDelayMs = 1;
        esp32Service.post = async () => {
            calls += 1;
            if (calls < 3) return { sent: false, error: 'temporary' };
            return { sent: true, status: 200 };
        };

        const result = await esp32Service.postWithRetry('/fake', { ok: true });
        assert.equal(result.sent, true);
        assert.equal(result.attempt, 3);
    } finally {
        esp32Service.post = originalPost;
        esp32Service.maxRetries = originalRetries;
        esp32Service.retryDelayMs = originalDelay;
    }
});

test('processVipPayment creates PENDING then CONFIRMED transaction and binds ticket', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;
    const originalWait = esp32Service.waitTransactionConfirmation;

    try {
        esp32Service.postWithRetry = async () => ({ sent: true, status: 200, attempt: 1, data: {} });
        esp32Service.waitTransactionConfirmation = async () => ({ confirmed: true, status: 'CONFIRMED', polls: 1 });

        const payment = await esp32Service.processVipPayment({
            device_id: 'esp32-test-1',
            amount: 50,
            payload: { etablissement: 'E1', queue: 'Q1' }
        });

        assert.equal(payment.confirmed, true);
        assert.equal(payment.status, 'CONFIRMED');
        assert.ok(payment.transaction_id);

        const tx = await Transaction.findByTransactionId(payment.transaction_id);
        assert.ok(tx);
        assert.equal(tx.status, 'CONFIRMED');
        assert.equal(tx.ticket_id, null);

        const attached = await esp32Service.attachTransactionToTicket(payment.transaction_id, 'ticket-123');
        assert.ok(attached);
        assert.equal(attached.ticket_id, 'ticket-123');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
        esp32Service.waitTransactionConfirmation = originalWait;
    }
});

test('processVipPayment marks transaction FAILED when ESP32 send fails', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;

    try {
        esp32Service.postWithRetry = async () => ({ sent: false, error: 'network down', attempt: 3 });

        const payment = await esp32Service.processVipPayment({
            device_id: 'esp32-test-fail',
            amount: 50,
            payload: {}
        });

        assert.equal(payment.confirmed, false);
        assert.equal(payment.status, 'FAILED');

        const tx = await Transaction.findByTransactionId(payment.transaction_id);
        assert.ok(tx);
        assert.equal(tx.status, 'FAILED');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
    }
});

test('processVipPaymentWithTicket creates CONFIRMED transaction with ticket binding', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;
    const originalWait = esp32Service.waitTransactionConfirmation;

    try {
        esp32Service.postWithRetry = async () => ({ sent: true, status: 200, attempt: 1 });
        esp32Service.waitTransactionConfirmation = async () => ({ confirmed: true, status: 'CONFIRMED', polls: 1 });

        const result = await esp32Service.processVipPaymentWithTicket({
            transaction_id: 'tx-flow-1',
            device_id: 'esp32-flow',
            establishment_id: 'est-flow',
            amount: 50,
            payload: { queue: 'A' },
            createTicket: async () => ({ id: 'ticket-flow-1', number: '10' })
        });

        assert.equal(result.confirmed, true);
        assert.equal(result.status, 'CONFIRMED');
        assert.equal(result.ticket_id, 'ticket-flow-1');

        const tx = await Transaction.findByTransactionId('tx-flow-1');
        assert.ok(tx);
        assert.equal(tx.status, 'CONFIRMED');
        assert.equal(tx.ticket_id, 'ticket-flow-1');
        assert.equal(tx.establishment_id, 'est-flow');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
        esp32Service.waitTransactionConfirmation = originalWait;
    }
});

test('processVipPaymentWithTicket ignores duplicate already confirmed transaction', async () => {
    await Transaction.create({
        transaction_id: 'tx-dup-1',
        device_id: 'esp32-dup',
        establishment_id: 'est-dup',
        amount: 50,
        status: 'CONFIRMED',
        ticket_id: 'ticket-dup-1'
    });

    const result = await esp32Service.processVipPaymentWithTicket({
        transaction_id: 'tx-dup-1',
        device_id: 'esp32-dup',
        establishment_id: 'est-dup',
        amount: 50,
        payload: {},
        createTicket: async () => ({ id: 'should-not-run' })
    });

    assert.equal(result.confirmed, true);
    assert.equal(result.ignored, true);
    assert.equal(result.ticket_id, 'ticket-dup-1');
});

test('processVipPaymentWithTicket retries server ticket creation then confirms', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;
    const originalWait = esp32Service.waitTransactionConfirmation;

    try {
        esp32Service.postWithRetry = async () => ({ sent: true, status: 200, attempt: 1 });
        esp32Service.waitTransactionConfirmation = async () => ({ confirmed: true, status: 'CONFIRMED', polls: 1 });

        let attempts = 0;
        const result = await esp32Service.processVipPaymentWithTicket({
            transaction_id: 'tx-retry-1',
            device_id: 'esp32-retry',
            establishment_id: 'est-retry',
            amount: 50,
            payload: {},
            createTicket: async () => {
                attempts += 1;
                if (attempts < 2) throw new Error('temporary DB fail');
                return { id: 'ticket-retry-1' };
            }
        });

        assert.equal(result.confirmed, true);
        assert.equal(attempts >= 2, true);

        const tx = await Transaction.findByTransactionId('tx-retry-1');
        assert.equal(tx.status, 'CONFIRMED');
        assert.equal(tx.ticket_id, 'ticket-retry-1');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
        esp32Service.waitTransactionConfirmation = originalWait;
    }
});

test('waitTransactionConfirmation prioritizes DB final status before ESP32 events', async () => {
    const originalDbLookup = esp32Service.getTransactionStatusFromDb;
    const originalEspLookup = esp32Service.getTransactionStatus;
    const originalPolls = esp32Service.confirmationPolls;
    const originalInterval = esp32Service.confirmationIntervalMs;

    try {
        let espCalls = 0;
        esp32Service.confirmationPolls = 2;
        esp32Service.confirmationIntervalMs = 1;
        esp32Service.getTransactionStatusFromDb = async () => ({
            confirmed: true,
            status: 'CONFIRMED',
            source: 'transaction_db'
        });
        esp32Service.getTransactionStatus = async () => {
            espCalls += 1;
            return { confirmed: false, status: 'PENDING', source: 'esp32_events' };
        };

        const result = await esp32Service.waitTransactionConfirmation('tx-db-priority-1');
        assert.equal(result.status, 'CONFIRMED');
        assert.equal(result.source, 'transaction_db');
        assert.equal(result.polls, 1);
        assert.equal(espCalls, 0);
    } finally {
        esp32Service.getTransactionStatusFromDb = originalDbLookup;
        esp32Service.getTransactionStatus = originalEspLookup;
        esp32Service.confirmationPolls = originalPolls;
        esp32Service.confirmationIntervalMs = originalInterval;
    }
});

test('processVipPaymentWithTicket confirms immediately from ESP32 response payload', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;
    const originalWait = esp32Service.waitTransactionConfirmation;

    try {
        let waitCalls = 0;
        esp32Service.postWithRetry = async () => ({
            sent: true,
            status: 200,
            attempt: 1,
            data: { payment_status: 'PAID' }
        });
        esp32Service.waitTransactionConfirmation = async () => {
            waitCalls += 1;
            return { confirmed: false, status: 'PENDING' };
        };

        const result = await esp32Service.processVipPaymentWithTicket({
            transaction_id: 'tx-immediate-1',
            device_id: 'esp32-immediate',
            establishment_id: 'est-immediate',
            amount: 50,
            payload: {},
            createTicket: async () => ({ id: 'ticket-immediate-1' })
        });

        assert.equal(result.confirmed, true);
        assert.equal(result.status, 'CONFIRMED');
        assert.equal(result.ticket_id, 'ticket-immediate-1');
        assert.equal(waitCalls, 0);

        const tx = await Transaction.findByTransactionId('tx-immediate-1');
        assert.ok(tx);
        assert.equal(tx.status, 'CONFIRMED');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
        esp32Service.waitTransactionConfirmation = originalWait;
    }
});

test('processVipPayment confirms immediately from ESP32 response payload', async () => {
    const originalPostWithRetry = esp32Service.postWithRetry;
    const originalWait = esp32Service.waitTransactionConfirmation;

    try {
        let waitCalls = 0;
        esp32Service.postWithRetry = async () => ({
            sent: true,
            status: 200,
            attempt: 1,
            data: { status: 'CONFIRMED' }
        });
        esp32Service.waitTransactionConfirmation = async () => {
            waitCalls += 1;
            return { confirmed: false, status: 'PENDING' };
        };

        const result = await esp32Service.processVipPayment({
            device_id: 'esp32-immediate-vip',
            amount: 50,
            payload: { transaction_id: 'tx-immediate-vip-1' }
        });

        assert.equal(result.confirmed, true);
        assert.equal(result.status, 'CONFIRMED');
        assert.equal(waitCalls, 0);

        const tx = await Transaction.findByTransactionId('tx-immediate-vip-1');
        assert.ok(tx);
        assert.equal(tx.status, 'CONFIRMED');
    } finally {
        esp32Service.postWithRetry = originalPostWithRetry;
        esp32Service.waitTransactionConfirmation = originalWait;
    }
});

test('getTransactionStatus matches ESP32 event id_ticket when transaction_id is absent', async () => {
    const originalGetEvents = esp32Service.getEvents;

    try {
        esp32Service.getEvents = async () => ({
            ok: true,
            status: 200,
            data: {
                events: [
                    { type: 'VIP', id_ticket: 'tx-via-id-ticket-1', payment_status: 'PENDING' },
                    { type: 'PAYMENT', id_ticket: 'tx-via-id-ticket-1', payment_status: 'PAID' }
                ]
            }
        });

        const status = await esp32Service.getTransactionStatus('tx-via-id-ticket-1');
        assert.equal(status.confirmed, true);
        assert.equal(status.status, 'CONFIRMED');
        assert.equal(status.source, 'esp32_events');
    } finally {
        esp32Service.getEvents = originalGetEvents;
    }
});
