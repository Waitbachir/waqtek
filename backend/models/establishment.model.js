
import supabase from '../services/supabase.service.js';

class Establishment {

    static async create(data) {
        return await supabase.createEstablishment(data);
    }

    static async getAll() {
        return await supabase.getEstablishments();
    }

    static async getByManagerId(managerId) {
        return await supabase.findWhere("establishments", { manager_id: managerId });
    }

    static async findById(id) {
        return await supabase.findById("establishments", id);
    }

    static async update(id, data) {
        return await supabase.update("establishments", id, data);
    }

    static async delete(id) {
        return await supabase.delete("establishments", id);
    }
}

export default Establishment;


