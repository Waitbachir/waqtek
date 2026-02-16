import Ticket from "../models/ticket.model.js";

const DEFAULT_COUNTERS = Number(process.env.MANAGER_COUNTER_COUNT || 6);
const CONTEXT_TTL_MS = Number(process.env.MANAGER_CONTEXT_TTL_MS || 30 * 60 * 1000);

const contextStore = new Map();

function nowMs() {
    return Date.now();
}

function cleanupExpired() {
    const now = nowMs();
    for (const [userId, context] of contextStore.entries()) {
        if (!context?.expiresAt || context.expiresAt <= now) {
            contextStore.delete(userId);
        }
    }
}

function normalizeCounter(counter) {
    const value = Number(counter);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.floor(value);
}

function extractTicketCounter(ticket) {
    return normalizeCounter(
        ticket?.counter ??
        ticket?.counter_number ??
        ticket?.counterNumber ??
        ticket?.guichet ??
        ticket?.window
    );
}

function isCalledTicket(ticket) {
    return String(ticket?.status || "").toLowerCase() === "called";
}

function getQueueId(queue) {
    return String(queue?.id ?? queue?.queue_id ?? queue?.queueId ?? "").trim();
}

class ManagerContextService {
    static setContext({ userId, establishmentId, queueId, counter }) {
        cleanupExpired();
        const normalizedCounter = normalizeCounter(counter);
        if (!userId || !queueId || !normalizedCounter) {
            return null;
        }

        const savedAt = new Date().toISOString();
        const context = {
            userId: String(userId),
            establishmentId: establishmentId ? String(establishmentId) : null,
            queueId: String(queueId),
            counter: normalizedCounter,
            savedAt,
            expiresAt: nowMs() + CONTEXT_TTL_MS
        };

        contextStore.set(String(userId), context);
        return { ...context };
    }

    static getContext(userId) {
        cleanupExpired();
        if (!userId) return null;
        const current = contextStore.get(String(userId));
        if (!current) return null;
        return { ...current };
    }

    static clearContext(userId) {
        if (!userId) return false;
        return contextStore.delete(String(userId));
    }

    static async getOccupiedCounters(queueId) {
        cleanupExpired();
        if (!queueId) return [];

        const occupied = new Set();

        const tickets = await Ticket.findByQueue(queueId);
        (Array.isArray(tickets) ? tickets : [])
            .filter(isCalledTicket)
            .forEach((ticket) => {
                const counter = extractTicketCounter(ticket);
                if (counter) occupied.add(counter);
            });

        for (const context of contextStore.values()) {
            if (String(context?.queueId) === String(queueId)) {
                const counter = normalizeCounter(context.counter);
                if (counter) occupied.add(counter);
            }
        }

        return [...occupied].sort((a, b) => a - b);
    }

    static async getAvailableCounters(queueId, options = {}) {
        const maxCounters = Number(options.maxCounters || DEFAULT_COUNTERS);
        const currentUserId = options.currentUserId ? String(options.currentUserId) : null;

        if (!queueId || !Number.isFinite(maxCounters) || maxCounters <= 0) {
            return [];
        }

        const occupiedSet = new Set(await this.getOccupiedCounters(queueId));

        // A manager can keep using his own reserved counter.
        if (currentUserId) {
            const current = this.getContext(currentUserId);
            if (current && String(current.queueId) === String(queueId)) {
                occupiedSet.delete(normalizeCounter(current.counter));
            }
        }

        const available = [];
        for (let i = 1; i <= Math.floor(maxCounters); i += 1) {
            if (!occupiedSet.has(i)) available.push(i);
        }
        return available;
    }

    static __resetForTests() {
        contextStore.clear();
    }
}

export default ManagerContextService;
