import supabase from '../services/supabase.service.js';

class Ticket {

    static async create(data) {
        const payload = {
            queue_id: data.queueId,         // ✅ DB
            number: data.number,            // ✅ NOT NULL
            client_id: data.clientId,       // <-- ajouté ici
            status: data.status || "waiting"
        };

        if (data.establishmentId !== undefined && data.establishmentId !== null) {
            payload.establishment_id = data.establishmentId;
        }

        return await supabase.createTicket(payload);
    }

    static async findById(id) {
        return await supabase.findById("tickets", id);
    }

    static async findAll() {
        return await supabase.findAll("tickets");
    }

    static async getByQueue(queueId) {
        return await supabase.findWhere("tickets", {
            queue_id: queueId
        });
    }

    static async updateStatus(id, status) {
        return await supabase.updateTicketStatus(id, status);
    }

    static async update(id, data) {
        return await supabase.update("tickets", id, data);
    }

    static async delete(id) {
        return await supabase.delete("tickets", id);
    }

    static async getByClientAndQueue(clientId, queueId) {
        return await supabase.findWhere("tickets", {
            client_id: clientId,
            queue_id: queueId
        });
    }

    static async findByQueue(queueId) {
        return await supabase.findWhere("tickets", { queue_id: queueId });
    }

}

export default Ticket;

