
import supabase from '../services/supabase.service.js';


class Queue {
    static async create(data) {
        return await supabase.createQueue(data);
    }

    static async getAll() {
        return await supabase.findAll("queues");
    }

    static async findById(id) {
        return await supabase.getQueueById(id);
    }

    static async update(id, data) {
        return await supabase.update("queues", id, data);
    }

    static async delete(id) {
        return await supabase.delete("queues", id);
    }

   static async getByEstablishment(estId) {
    return await supabase.getQueuesByEstablishment(estId);
}

    static async getByEstablishmentIds(estIds = []) {
        if (!Array.isArray(estIds) || estIds.length === 0) {
            return [];
        }

        const results = await Promise.all(
            estIds.map((id) => this.getByEstablishment(id))
        );

        return results.flat().filter(Boolean);
    }



}

export default Queue;


