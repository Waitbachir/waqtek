import supabase from '../services/supabase.service.js';

class Transaction {
    static async create({
        transaction_id,
        device_id,
        establishment_id = null,
        amount,
        status = 'PENDING',
        ticket_id = null,
        created_at = new Date().toISOString()
    }) {
        return await supabase.insert('transactions', {
            transaction_id,
            device_id,
            establishment_id,
            amount,
            status,
            ticket_id,
            created_at
        });
    }

    static async findByTransactionId(transactionId) {
        const rows = await supabase.findWhere('transactions', { transaction_id: transactionId });
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    static async updateByTransactionId(transactionId, data) {
        const existing = await this.findByTransactionId(transactionId);
        if (!existing) return null;
        return await supabase.update('transactions', existing.id, data);
    }

    static async findByTicketId(ticketId) {
        const rows = await supabase.findWhere('transactions', { ticket_id: ticketId });
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }
}

export default Transaction;
