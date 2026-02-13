import logger from '../core/logger.js';
// supabase.service.js
import { createClient } from '@supabase/supabase-js';

class SupabaseService {
    constructor() {
        // Mode test : store en m�moire pour �viter toute d�pendance Supabase.
        if (process.env.NODE_ENV === 'test' || process.env.USE_FAKE_SUPABASE === 'true') {
            this._testMode = true;
            this._store = {};
            this._nextIds = {};
            return;
        }

        const supabaseKey =
            process.env.SUPABASE_SERVICE_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_KEY;

        this.client = createClient(
            process.env.SUPABASE_URL,
            supabaseKey
        );
    }

    // M�thode g�n�rique avec catch automatique.
    async safeQuery(promise) {
        try {
            const { data, error } = await promise;
            if (error) {
                logger.error('Supabase Error:', error);
                return null;
            }
            return data;
        } catch (err) {
            logger.error('Unexpected Supabase Exception:', err);
            return null;
        }
    }

    // --------------------------------------
    // CRUD g�n�riques
    // --------------------------------------

    _getTestTable(table) {
        if (!this._store[table]) {
            this._store[table] = [];
            this._nextIds[table] = 1;
        }
        return this._store[table];
    }

    async insert(table, data) {
        if (this._testMode) {
            const rows = this._getTestTable(table);
            const entry = {
                ...data,
                id: data?.id ?? this._nextIds[table]++
            };
            rows.push(entry);
            return entry;
        }

        return await this.safeQuery(
            this.client.from(table).insert(data).select().single()
        );
    }

    async update(table, id, data) {
        if (this._testMode) {
            const rows = this._getTestTable(table);
            const index = rows.findIndex((row) => String(row.id) === String(id));
            if (index < 0) return null;
            rows[index] = { ...rows[index], ...data };
            return rows[index];
        }

        return await this.safeQuery(
            this.client.from(table).update(data).eq('id', id).select().single()
        );
    }

    async delete(table, id) {
        if (this._testMode) {
            const rows = this._getTestTable(table);
            const index = rows.findIndex((row) => String(row.id) === String(id));
            if (index < 0) return null;
            const [deleted] = rows.splice(index, 1);
            return deleted;
        }

        return await this.safeQuery(
            this.client.from(table).delete().eq('id', id)
        );
    }

    async findById(table, id) {
        if (this._testMode) {
            const rows = this._getTestTable(table);
            return rows.find((row) => String(row.id) === String(id)) || null;
        }

        return await this.safeQuery(
            this.client.from(table).select('*').eq('id', id).single()
        );
    }

    async findAll(table) {
        if (this._testMode) {
            return [...this._getTestTable(table)];
        }

        return await this.safeQuery(
            this.client.from(table).select('*')
        );
    }

    async findWhere(table, filters = {}) {
        if (this._testMode) {
            const rows = this._getTestTable(table);
            return rows.filter((row) =>
                Object.keys(filters).every((key) => String(row[key]) === String(filters[key]))
            );
        }

        let query = this.client.from(table).select('*');
        Object.keys(filters).forEach((k) => {
            query = query.eq(k, filters[k]);
        });
        return await this.safeQuery(query);
    }

    // --------------------------------------
    // USERS
    // --------------------------------------

    async createUser(user) {
        return await this.insert('users', user);
    }

    async getUserByEmail(email) {
        if (this._testMode) {
            const rows = this._getTestTable('users');
            return rows.find((u) => u.email === email) || null;
        }

        return await this.safeQuery(
            this.client.from('users').select('*').eq('email', email).single()
        );
    }

    // --------------------------------------
    // ESTABLISHMENTS
    // --------------------------------------

    async createEstablishment(est) {
        return await this.insert('establishments', est);
    }

    async getEstablishments() {
        return await this.findAll('establishments');
    }

    // --------------------------------------
    // QUEUES
    // --------------------------------------

    async createQueue(queue) {
        return await this.insert('queues', queue);
    }

    async getQueuesByEstablishment(estId) {
        return await this.findWhere('queues', { establishmentid: estId });
    }

    async getQueueById(id) {
        return await this.findById('queues', id);
    }

    // --------------------------------------
    // TICKETS
    // --------------------------------------

    async createTicket(ticket) {
        return await this.insert('tickets', ticket);
    }

    async updateTicketStatus(id, status, counter = undefined) {
        const payload = { status };
        if (counter !== undefined) payload.counter = counter;

        return await this.update('tickets', id, payload);
    }

    // --------------------------------------
    // SUBSCRIPTIONS
    // --------------------------------------

    async createSubscription(sub) {
        return await this.insert('subscriptions', sub);
    }

    async getSubscriptionsByEstablishment(estId) {
        return await this.findWhere('subscriptions', {
            establishmentId: estId
        });
    }

    // --------------------------------------
    // QUEUES - Num�ro de ticket atomique
    // --------------------------------------

    async getNextTicketNumber(queueId) {
        return await this.safeQuery(
            this.client.rpc('next_ticket_number', {
                q_id: queueId
            })
        );
    }
}

export default new SupabaseService();
