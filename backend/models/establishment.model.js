
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

    static async getByIds(ids = []) {
        const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((v) => String(v).trim()).filter(Boolean))];
        if (!uniqueIds.length) return [];

        const rows = await Promise.all(uniqueIds.map((id) => this.findById(id)));
        return rows.filter(Boolean);
    }

    static async update(id, data) {
        return await supabase.update("establishments", id, data);
    }

    static async delete(id) {
        return await supabase.delete("establishments", id);
    }
}

export default Establishment;


